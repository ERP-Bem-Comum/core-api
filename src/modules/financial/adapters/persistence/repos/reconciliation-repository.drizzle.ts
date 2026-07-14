// Adapter Drizzle do ReconciliationRepository (#123). `confirm`/`undo` abrem UMA transação e fazem o
// write cross-aggregate (conciliação + status do título + status da transação) — atomicidade exigida
// pela invariante de negócio. UPDATE condicional (`WHERE status=...`) + checagem de affectedRows blinda
// contra corrida (o snapshot lido pelo use-case pode ter mudado). Boundary: try/catch → Result.

import { and, eq, inArray, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Reconciliation } from '#src/modules/financial/domain/reconciliation/types.ts';
import { deriveReconciledStatus } from '#src/modules/financial/domain/payable/reconciled-status.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationEvent } from '#src/modules/financial/domain/reconciliation/events.ts';
import type { StatementTransactionId } from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { ExpectedCounterpart } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '#src/modules/financial/application/ports/reconciliation-repository.ts';
import type { FinancialAppendableEvent } from '#src/modules/financial/application/ports/outbox.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import {
  finExpectedCounterpart,
  finManualEntries,
  finPayables,
  finReconciliationItems,
  finReconciliations,
  finStatementTransactions,
} from '../schemas/mysql.ts';
import {
  reconciliationToRow,
  itemsToRows,
  manualEntryToRow,
  toDomain,
} from '../mappers/reconciliation.mapper.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-reconciliation-repo] ${op} failed: ${String(cause)}\n`);
};

// mysql2 expõe affectedRows no ResultSetHeader (índice 0 do retorno). Espelha document-repository.drizzle.ts.
const affectedRowsOf = (result: unknown): number =>
  (result as unknown as [{ affectedRows: number }])[0].affectedRows;

export const createDrizzleReconciliationRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ReconciliationRepository => {
  const { db } = handle;

  return {
    confirm: async (
      reconciliation: Reconciliation,
      transactionId: StatementTransactionId,
      events?: readonly ReconciliationEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(finReconciliations).values(reconciliationToRow(reconciliation));
          const itemRows = itemsToRows(reconciliation);
          if (itemRows.length > 0) await tx.insert(finReconciliationItems).values(itemRows);

          // #141/#247: diferença classificada → ManualEntry vinculado (decisão b). Partial não gera.
          if (reconciliation.manualEntry !== null) {
            await tx
              .insert(finManualEntries)
              .values(manualEntryToRow(reconciliation.id, reconciliation.manualEntry));
          }

          // #141/#247: status do título DERIVADO da soma das conciliações ATIVAS (incl. esta, já inserida).
          // Soma >= valor → Reconciled; > 0 e < valor → PartiallyReconciled. Transição válida só a partir
          // de Paid ou PartiallyReconciled (CA6: 2º parcial fecha um título já PartiallyReconciled).
          for (const item of reconciliation.items) {
            const valueRows = await tx
              .select({ value: finPayables.value })
              .from(finPayables)
              .where(eq(finPayables.id, String(item.payableId)))
              .limit(1);
            const value = valueRows[0]?.value;
            if (value === undefined) throw new Error('payable-not-found');

            const sumRows = await tx
              .select({
                total: sql<number>`coalesce(sum(${finReconciliationItems.reconciledValueCents}), 0)`,
              })
              .from(finReconciliationItems)
              .innerJoin(
                finReconciliations,
                eq(finReconciliationItems.reconciliationId, finReconciliations.id),
              )
              .where(
                and(
                  eq(finReconciliationItems.payableId, String(item.payableId)),
                  eq(finReconciliations.status, 'Active'),
                ),
              );
            const reconciledSum = sumRows[0]?.total ?? 0;
            const nextStatus = deriveReconciledStatus(value, reconciledSum);

            const res = await tx
              .update(finPayables)
              .set({ status: nextStatus })
              .where(
                and(
                  eq(finPayables.id, String(item.payableId)),
                  inArray(finPayables.status, ['Paid', 'PartiallyReconciled']),
                ),
              );
            if (affectedRowsOf(res) !== 1) throw new Error('payable-not-paid');
          }

          const txRes = await tx
            .update(finStatementTransactions)
            .set({ reconciliationStatus: 'Reconciled' })
            .where(
              and(
                eq(finStatementTransactions.id, String(transactionId)),
                eq(finStatementTransactions.reconciliationStatus, 'Pending'),
              ),
            );
          if (affectedRowsOf(txRes) !== 1) throw new Error('transaction-not-pending');

          // #127: estado + evento na MESMA tx (atomicidade — ADR-0015). Falha aqui reverte tudo.
          await appendFinOutboxInTx(tx, events ?? []);
        });
        return ok(undefined);
      } catch (cause) {
        logStore('confirm', cause);
        return err('reconciliation-repository-failure');
      }
    },

    confirmManualEntry: async (
      reconciliation: Reconciliation,
      transactionId: StatementTransactionId,
      events?: readonly ReconciliationEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      const manualEntry = reconciliation.manualEntry;
      if (manualEntry === null) return err('reconciliation-repository-failure');
      try {
        await db.transaction(async (tx) => {
          await tx.insert(finReconciliations).values(reconciliationToRow(reconciliation));
          await tx
            .insert(finManualEntries)
            .values(manualEntryToRow(reconciliation.id, manualEntry));
          const txRes = await tx
            .update(finStatementTransactions)
            .set({ reconciliationStatus: 'Reconciled' })
            .where(
              and(
                eq(finStatementTransactions.id, String(transactionId)),
                eq(finStatementTransactions.reconciliationStatus, 'Pending'),
              ),
            );
          if (affectedRowsOf(txRes) !== 1) throw new Error('transaction-not-pending');

          // #127: estado + evento na MESMA tx (atomicidade — ADR-0015). Falha aqui reverte tudo.
          await appendFinOutboxInTx(tx, events ?? []);
        });
        return ok(undefined);
      } catch (cause) {
        logStore('confirmManualEntry', cause);
        return err('reconciliation-repository-failure');
      }
    },

    confirmCounterpartMatch: async (
      reconciliation: Reconciliation,
      counterpart: ExpectedCounterpart,
      transactionId: StatementTransactionId,
      events?: readonly FinancialAppendableEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      const manualEntry = reconciliation.manualEntry;
      if (manualEntry === null) return err('reconciliation-repository-failure');
      try {
        await db.transaction(async (tx) => {
          // Perna B: Reconciliation ManualEntry/Transfer (espelho da perna A) + o lançamento contábil.
          await tx.insert(finReconciliations).values(reconciliationToRow(reconciliation));
          await tx
            .insert(finManualEntries)
            .values(manualEntryToRow(reconciliation.id, manualEntry));

          const txRes = await tx
            .update(finStatementTransactions)
            .set({ reconciliationStatus: 'Reconciled' })
            .where(
              and(
                eq(finStatementTransactions.id, String(transactionId)),
                eq(finStatementTransactions.reconciliationStatus, 'Pending'),
              ),
            );
          if (affectedRowsOf(txRes) !== 1) throw new Error('transaction-not-pending');

          // Consome a contrapartida (Pending → Matched) — UPDATE condicional blinda contra corrida.
          const cpRes = await tx
            .update(finExpectedCounterpart)
            .set({
              status: counterpart.status,
              matchedTransactionRef: counterpart.matchedTransactionRef,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(finExpectedCounterpart.id, String(counterpart.id)),
                eq(finExpectedCounterpart.status, 'Pending'),
              ),
            );
          if (affectedRowsOf(cpRes) !== 1) throw new Error('counterpart-not-pending');

          // #127: estado + eventos na MESMA tx (atomicidade — ADR-0015). Falha aqui reverte tudo.
          await appendFinOutboxInTx(tx, events ?? []);
        });
        return ok(undefined);
      } catch (cause) {
        logStore('confirmCounterpartMatch', cause);
        return err('reconciliation-repository-failure');
      }
    },

    findById: async (
      id: ReconciliationId,
    ): Promise<Result<Reconciliation | null, ReconciliationRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finReconciliations)
          .where(eq(finReconciliations.id, String(id)))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const itemRows = await db
          .select()
          .from(finReconciliationItems)
          .where(eq(finReconciliationItems.reconciliationId, String(id)));

        const mapped = toDomain(row, itemRows);
        if (!mapped.ok) {
          logStore('findById:map', mapped.error);
          return err('reconciliation-repository-failure');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findById', cause);
        return err('reconciliation-repository-failure');
      }
    },

    findActiveByTransaction: async (
      transactionId: StatementTransactionId,
    ): Promise<Result<Reconciliation | null, ReconciliationRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finReconciliations)
          .where(
            and(
              eq(finReconciliations.transactionId, String(transactionId)),
              eq(finReconciliations.status, 'Active'),
            ),
          )
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const itemRows = await db
          .select()
          .from(finReconciliationItems)
          .where(eq(finReconciliationItems.reconciliationId, row.id));

        const mapped = toDomain(row, itemRows);
        if (!mapped.ok) {
          logStore('findActiveByTransaction:map', mapped.error);
          return err('reconciliation-repository-failure');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findActiveByTransaction', cause);
        return err('reconciliation-repository-failure');
      }
    },

    undo: async (
      reconciliation: Reconciliation,
      events?: readonly ReconciliationEvent[],
    ): Promise<Result<void, ReconciliationRepositoryError>> => {
      try {
        await db.transaction(async (tx) => {
          await tx
            .update(finReconciliations)
            .set({
              status: reconciliation.status,
              undoneAt: reconciliation.audit.undoneAt,
              undoneBy: reconciliation.audit.undoneBy,
              undoReason: reconciliation.audit.undoReason,
            })
            .where(eq(finReconciliations.id, String(reconciliation.id)));

          // #141/#247: re-deriva o status do título pelas conciliações ATIVAS restantes (a desta já foi
          // marcada Undone acima). Sem ativa (soma 0) → Paid; senão → Reconciled/PartiallyReconciled.
          for (const item of reconciliation.items) {
            const valueRows = await tx
              .select({ value: finPayables.value })
              .from(finPayables)
              .where(eq(finPayables.id, String(item.payableId)))
              .limit(1);
            const value = valueRows[0]?.value;
            if (value === undefined) continue;

            const sumRows = await tx
              .select({
                total: sql<number>`coalesce(sum(${finReconciliationItems.reconciledValueCents}), 0)`,
              })
              .from(finReconciliationItems)
              .innerJoin(
                finReconciliations,
                eq(finReconciliationItems.reconciliationId, finReconciliations.id),
              )
              .where(
                and(
                  eq(finReconciliationItems.payableId, String(item.payableId)),
                  eq(finReconciliations.status, 'Active'),
                ),
              );
            const reconciledSum = sumRows[0]?.total ?? 0;
            const nextStatus =
              reconciledSum <= 0 ? 'Paid' : deriveReconciledStatus(value, reconciledSum);

            await tx
              .update(finPayables)
              .set({ status: nextStatus })
              .where(
                and(
                  eq(finPayables.id, String(item.payableId)),
                  inArray(finPayables.status, ['Reconciled', 'PartiallyReconciled']),
                ),
              );
          }

          await tx
            .update(finStatementTransactions)
            .set({ reconciliationStatus: 'Pending' })
            .where(
              and(
                eq(finStatementTransactions.id, String(reconciliation.transactionId)),
                eq(finStatementTransactions.reconciliationStatus, 'Reconciled'),
              ),
            );

          // #127: estado + evento na MESMA tx (atomicidade — ADR-0015). Falha aqui reverte tudo.
          await appendFinOutboxInTx(tx, events ?? []);
        });
        return ok(undefined);
      } catch (cause) {
        logStore('undo', cause);
        return err('reconciliation-repository-failure');
      }
    },
  };
};
