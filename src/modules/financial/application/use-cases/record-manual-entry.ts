import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';

import * as ReconciliationId from '../../domain/reconciliation/reconciliation-id.ts';
import type { ReconciliationId as ReconciliationIdT } from '../../domain/reconciliation/reconciliation-id.ts';
import type { ManualEntryId } from '../../domain/reconciliation/manual-entry-id.ts';
import {
  confirmManualEntry,
  type ManualEntryError,
} from '../../domain/reconciliation/manual-entry.ts';
import type { ManualEntryType } from '../../domain/reconciliation/types.ts';
import { BudgetPlanRef, SubcategoryRef, type FinancialRefError } from '../../domain/shared/refs.ts';
import * as CedenteAccountId from '../../domain/cedente/cedente-account-id.ts';
import { isClosed } from '../../domain/cedente/cedente-account.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../ports/cedente-account-store.ts';
import type {
  BankStatementRepository,
  BankStatementRepositoryError,
} from '../ports/bank-statement-repository.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';
import type {
  ReconciliationPeriodStore,
  ReconciliationPeriodStoreError,
} from '../ports/reconciliation-period-store.ts';
import * as ExpectedCounterpartId from '../../domain/expected-counterpart/expected-counterpart-id.ts';
import * as ExpectedCounterpart from '../../domain/expected-counterpart/expected-counterpart.ts';
import type { ExpectedCounterpartError } from '../../domain/expected-counterpart/types.ts';
import type {
  ExpectedCounterpartStore,
  ExpectedCounterpartStoreError,
} from '../ports/expected-counterpart-store.ts';

export type RecordManualEntryDeps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'confirmManualEntry'>;
  statements: Pick<BankStatementRepository, 'findTransaction'>;
  cedenteStore: Pick<CedenteAccountStore, 'findById'>;
  periods: Pick<ReconciliationPeriodStore, 'isClosed'>;
  clock: Pick<Clock, 'now'>;
  // #269/US1: cria a contrapartida esperada no destino quando `type='Transfer'` + `destinationAccountRef`.
  expectedCounterpartStore: Pick<ExpectedCounterpartStore, 'save'>;
}>;

export type RecordManualEntryInput = Readonly<{
  transactionId: string;
  type: ManualEntryType;
  supplierRef?: string;
  // #502/S2: plano orçamentário + subcategoria (folha) no título manual — rehidratados via VO na borda.
  budgetPlanRef?: string;
  subcategoryRef?: string;
  categoryRef?: string;
  costCenterRef?: string;
  programRef?: string;
  description?: string;
  destinationAccountRef?: string;
  productLabel?: string;
  // #370: campos de documento. `documentValueCents` omitido → default = valor da transação (domínio).
  documentNumber?: string;
  documentType?: string;
  issueDate?: Date;
  documentValueCents?: number;
  reconciledBy: string;
}>;

export type RecordManualEntryOutput = Readonly<{
  reconciliationId: ReconciliationIdT;
  manualEntryId: ManualEntryId;
  // #370: ecoa os campos de documento como ficaram no domínio (documentValueCents já com o default aplicado).
  documentNumber: string | null;
  documentType: string | null;
  issueDate: Date | null;
  documentValueCents: number;
}>;

export type RecordManualEntryError =
  | ManualEntryError
  | FinancialRefError
  | 'statement-transaction-not-found'
  | 'transaction-already-reconciled'
  | 'cedente-account-not-found'
  | 'destination-account-not-found'
  | 'destination-same-as-source'
  | 'account-closed'
  | 'period-closed'
  | ReconciliationRepositoryError
  | BankStatementRepositoryError
  | CedenteAccountStoreError
  | ReconciliationPeriodStoreError
  | ExpectedCounterpartError
  | ExpectedCounterpartStoreError;

// Lança um ManualEntry para uma transação `Pending` sem título (ex.: tarifa). Guard FR-015 (conta não
// `Closed`) → domínio confirmManualEntry (valor = valor da transação) → unit-of-work → outbox. R1.
export const recordManualEntry =
  (deps: RecordManualEntryDeps) =>
  async (
    input: RecordManualEntryInput,
  ): Promise<Result<RecordManualEntryOutput, RecordManualEntryError>> => {
    const txR = await deps.statements.findTransaction(input.transactionId);
    if (!txR.ok) return err(txR.error);
    if (txR.value === null) return err('statement-transaction-not-found');
    const { transaction, debitAccountRef } = txR.value;
    if (transaction.reconciliationStatus !== 'Pending')
      return err('transaction-already-reconciled');

    const accId = CedenteAccountId.rehydrate(debitAccountRef);
    if (!accId.ok) return err('cedente-account-not-found');
    const accR = await deps.cedenteStore.findById(accId.value);
    if (!accR.ok) return err(accR.error);
    if (accR.value === null) return err('cedente-account-not-found');
    if (isClosed(accR.value)) return err('account-closed');

    // Guard R18: período fechado não aceita lançamento manual na data da transação.
    const periodClosedR = await deps.periods.isClosed(debitAccountRef, transaction.date);
    if (!periodClosedR.ok) return err(periodClosedR.error);
    if (periodClosedR.value) return err('period-closed');

    // #143: conta de destino da realocação (Transfer) — existe + ≠ origem.
    let destinationAccountId: CedenteAccountId.CedenteAccountId | null = null;
    if (input.destinationAccountRef !== undefined) {
      if (input.destinationAccountRef === debitAccountRef) return err('destination-same-as-source');
      const destId = CedenteAccountId.rehydrate(input.destinationAccountRef);
      if (!destId.ok) return err('destination-account-not-found');
      const destR = await deps.cedenteStore.findById(destId.value);
      if (!destR.ok) return err(destR.error);
      if (destR.value === null) return err('destination-account-not-found');
      destinationAccountId = destId.value;
    }

    // #502/S2: rehidrata os refs de taxonomia (formato UUID v4) — defense-in-depth além do Zod da
    // borda. Refs opacos (ADR-0014): valida só o formato, sem chamar budget-plans. Domínio guarda a string.
    if (input.budgetPlanRef !== undefined) {
      const r = BudgetPlanRef.rehydrate(input.budgetPlanRef);
      if (!r.ok) return err(r.error);
    }
    if (input.subcategoryRef !== undefined) {
      const r = SubcategoryRef.rehydrate(input.subcategoryRef);
      if (!r.ok) return err(r.error);
    }

    const confirmed = confirmManualEntry({
      reconciliationId: ReconciliationId.generate(),
      transactionId: transaction.id,
      type: input.type,
      valueCents: transaction.valueCents,
      ...(input.supplierRef !== undefined ? { supplierRef: input.supplierRef } : {}),
      ...(input.budgetPlanRef !== undefined ? { budgetPlanRef: input.budgetPlanRef } : {}),
      ...(input.subcategoryRef !== undefined ? { subcategoryRef: input.subcategoryRef } : {}),
      ...(input.categoryRef !== undefined ? { categoryRef: input.categoryRef } : {}),
      ...(input.costCenterRef !== undefined ? { costCenterRef: input.costCenterRef } : {}),
      ...(input.programRef !== undefined ? { programRef: input.programRef } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.destinationAccountRef !== undefined
        ? { destinationAccountRef: input.destinationAccountRef }
        : {}),
      ...(input.productLabel !== undefined ? { productLabel: input.productLabel } : {}),
      ...(input.documentNumber !== undefined ? { documentNumber: input.documentNumber } : {}),
      ...(input.documentType !== undefined ? { documentType: input.documentType } : {}),
      ...(input.issueDate !== undefined ? { issueDate: input.issueDate } : {}),
      ...(input.documentValueCents !== undefined
        ? { documentValueCents: input.documentValueCents }
        : {}),
      reconciledBy: input.reconciledBy,
      occurredAt: deps.clock.now(),
    });
    if (!confirmed.ok) return err(confirmed.error);

    const saved = await deps.reconciliationRepo.confirmManualEntry(
      confirmed.value.reconciliation,
      transaction.id,
      confirmed.value.events,
    );
    if (!saved.ok) return err(saved.error);

    // #269/US1 + #428: transferência/aplicação/resgate A→B com destino → nasce a contrapartida esperada
    // (Pending, sinal oposto, valor da transação) na conta de destino, vinculada à perna de origem, com o
    // tipo e o produto do lançamento. Fora dos 3 tipos ou sem destino: nada criado (guard de não-regressão).
    if (
      (input.type === 'Transfer' || input.type === 'Investment' || input.type === 'Redemption') &&
      destinationAccountId !== null
    ) {
      const counterpart = ExpectedCounterpart.create({
        id: ExpectedCounterpartId.generate(),
        destinationAccountRef: destinationAccountId,
        originAccountRef: accId.value,
        originReconciliationRef: confirmed.value.reconciliation.id,
        originTransactionRef: String(transaction.id),
        type: input.type,
        ...(input.productLabel !== undefined ? { productLabel: input.productLabel } : {}),
        originMovement: transaction.movement,
        valueCents: BigInt(transaction.valueCents),
        expectedDate: transaction.date,
      });
      if (!counterpart.ok) return err(counterpart.error);
      const savedCounterpart = await deps.expectedCounterpartStore.save(
        counterpart.value.counterpart,
        counterpart.value.events,
      );
      if (!savedCounterpart.ok) return err(savedCounterpart.error);
    }

    const entry = confirmed.value.manualEntry;
    return ok({
      reconciliationId: confirmed.value.reconciliation.id,
      manualEntryId: entry.id,
      documentNumber: entry.documentNumber,
      documentType: entry.documentType,
      issueDate: entry.issueDate,
      documentValueCents: entry.documentValueCents ?? transaction.valueCents,
    });
  };
