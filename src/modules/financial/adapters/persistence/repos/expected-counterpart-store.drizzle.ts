// Adapter Drizzle do ExpectedCounterpartStore (#269, MySQL). `save` abre UMA transação: INSERT da
// contrapartida + publicação dos eventos no `fin_outbox` na MESMA tx (atomicidade — ADR-0015). Boundary:
// todo try/catch converte para Result; nenhum Error cruza a borda (.claude/rules/adapters.md).

import { and, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { ExpectedCounterpartId } from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import type { ExpectedCounterpart } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import type { ExpectedCounterpartEvent } from '#src/modules/financial/domain/expected-counterpart/events.ts';
import type {
  ExpectedCounterpartStore,
  ExpectedCounterpartStoreError,
} from '#src/modules/financial/application/ports/expected-counterpart-store.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finExpectedCounterpart } from '../schemas/mysql.ts';
import { toRow, toDomain } from '../mappers/expected-counterpart.mapper.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-expected-counterpart-store] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzleExpectedCounterpartStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ExpectedCounterpartStore => {
  const { db } = handle;

  return {
    save: async (
      counterpart: ExpectedCounterpart,
      events?: readonly ExpectedCounterpartEvent[],
    ): Promise<Result<void, ExpectedCounterpartStoreError>> => {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(finExpectedCounterpart).values(toRow(counterpart, new Date()));
          await appendFinOutboxInTx(tx, events ?? []);
        });
        return ok(undefined);
      } catch (cause) {
        logStore('save', cause);
        return err('expected-counterpart-store-unavailable');
      }
    },

    findById: async (
      id: ExpectedCounterpartId,
    ): Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finExpectedCounterpart)
          .where(eq(finExpectedCounterpart.id, String(id)))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);
        const mapped = toDomain(row);
        if (!mapped.ok) {
          logStore('findById:map', mapped.error);
          return err('expected-counterpart-store-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findById', cause);
        return err('expected-counterpart-store-unavailable');
      }
    },

    listPendingByAccount: async (
      accountRef: CedenteAccountId,
    ): Promise<Result<readonly ExpectedCounterpart[], ExpectedCounterpartStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finExpectedCounterpart)
          .where(
            and(
              eq(finExpectedCounterpart.destinationAccountRef, String(accountRef)),
              eq(finExpectedCounterpart.status, 'Pending'),
            ),
          );
        const out: ExpectedCounterpart[] = [];
        for (const row of rows) {
          const mapped = toDomain(row);
          if (!mapped.ok) {
            logStore('listPendingByAccount:map', mapped.error);
            return err('expected-counterpart-store-unavailable');
          }
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logStore('listPendingByAccount', cause);
        return err('expected-counterpart-store-unavailable');
      }
    },

    findByOriginReconciliation: async (
      reconciliationRef: ReconciliationId,
    ): Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finExpectedCounterpart)
          .where(eq(finExpectedCounterpart.originReconciliationRef, String(reconciliationRef)))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);
        const mapped = toDomain(row);
        if (!mapped.ok) {
          logStore('findByOriginReconciliation:map', mapped.error);
          return err('expected-counterpart-store-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findByOriginReconciliation', cause);
        return err('expected-counterpart-store-unavailable');
      }
    },
  };
};
