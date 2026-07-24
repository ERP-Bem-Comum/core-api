// Mapper row↔domínio da conciliação (#123). `toRow`/`itemsToRows` confiam no domínio; `toDomain`
// revalida IDs e enums (type/status/treatment) — o domínio rejeita estado inválido vindo do banco.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as ManualEntryId from '#src/modules/financial/domain/reconciliation/manual-entry-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import type {
  Difference,
  DifferenceTreatment,
  ManualEntry,
  ManualEntryType,
  Reconciliation,
  ReconciliationItem,
  ReconciliationStatus,
  ReconciliationType,
} from '#src/modules/financial/domain/reconciliation/types.ts';
import type {
  ManualEntryRow,
  NewManualEntryRow,
  NewReconciliationItemRow,
  NewReconciliationRow,
  ReconciliationItemRow,
  ReconciliationRow,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

export type ReconciliationMapperError =
  | 'invalid-reconciliation-id'
  | 'invalid-reconciliation-transaction-id'
  | 'invalid-reconciliation-payable-id'
  | 'invalid-reconciliation-type'
  | 'invalid-reconciliation-status'
  | 'invalid-reconciliation-difference'
  | 'invalid-manual-entry-id'
  | 'invalid-manual-entry-type';

const toManualEntryType = (raw: string): ManualEntryType | null =>
  raw === 'Payment' ||
  raw === 'Receipt' ||
  raw === 'Transfer' ||
  raw === 'FeePenaltyInterest' ||
  raw === 'Investment' ||
  raw === 'Redemption'
    ? raw
    : null;

// Inverso de `manualEntryToRow`: reidrata o lançamento manual a partir da linha `fin_manual_entries`.
export const manualEntryRowToDomain = (
  row: Readonly<ManualEntryRow>,
): Result<ManualEntry, ReconciliationMapperError> => {
  const id = ManualEntryId.rehydrate(row.id);
  if (!id.ok) return err('invalid-manual-entry-id');
  const type = toManualEntryType(row.type);
  if (type === null) return err('invalid-manual-entry-type');
  return ok(
    immutable<ManualEntry>({
      id: id.value,
      type,
      valueCents: row.valueCents,
      supplierRef: row.supplierRef,
      budgetPlanRef: row.budgetPlanRef,
      subcategoryRef: row.subcategoryRef,
      categoryRef: row.categoryRef,
      costCenterRef: row.costCenterRef,
      programRef: row.programRef,
      description: row.description,
      destinationAccountRef: row.destinationAccountRef,
      productLabel: row.productLabel,
    }),
  );
};

const toType = (raw: string): ReconciliationType | null =>
  raw === 'Individual' || raw === 'Multiple' || raw === 'Partial' || raw === 'ManualEntry'
    ? raw
    : null;

const toStatus = (raw: string): ReconciliationStatus | null =>
  raw === 'Active' || raw === 'Undone' ? raw : null;

const toTreatment = (raw: string): DifferenceTreatment | null =>
  raw === 'Interest' ||
  raw === 'Penalty' ||
  raw === 'Discount' ||
  raw === 'Fee' ||
  raw === 'Partial'
    ? raw
    : null;

export const reconciliationToRow = (reconciliation: Reconciliation): NewReconciliationRow => ({
  id: reconciliation.id,
  transactionId: reconciliation.transactionId,
  type: reconciliation.type,
  status: reconciliation.status,
  differenceValueCents: reconciliation.difference?.valueCents ?? null,
  differenceTreatment: reconciliation.difference?.treatment ?? null,
  reconciledAt: reconciliation.audit.reconciledAt,
  reconciledBy: reconciliation.audit.reconciledBy,
  undoneAt: reconciliation.audit.undoneAt,
  undoneBy: reconciliation.audit.undoneBy,
  undoReason: reconciliation.audit.undoReason,
});

export const itemsToRows = (reconciliation: Reconciliation): NewReconciliationItemRow[] =>
  reconciliation.items.map((item) => ({
    reconciliationId: reconciliation.id,
    payableId: item.payableId,
    reconciledValueCents: item.reconciledValueCents,
  }));

export const manualEntryToRow = (
  reconciliationId: ReconciliationId.ReconciliationId,
  manualEntry: ManualEntry,
): NewManualEntryRow => ({
  id: manualEntry.id,
  reconciliationId,
  type: manualEntry.type,
  valueCents: manualEntry.valueCents,
  supplierRef: manualEntry.supplierRef,
  budgetPlanRef: manualEntry.budgetPlanRef,
  subcategoryRef: manualEntry.subcategoryRef,
  categoryRef: manualEntry.categoryRef,
  costCenterRef: manualEntry.costCenterRef,
  programRef: manualEntry.programRef,
  description: manualEntry.description,
  destinationAccountRef: manualEntry.destinationAccountRef,
  productLabel: manualEntry.productLabel,
  documentNumber: manualEntry.documentNumber,
  documentType: manualEntry.documentType,
  issueDate: manualEntry.issueDate,
  documentValueCents: manualEntry.documentValueCents,
});

export const toDomain = (
  row: Readonly<ReconciliationRow>,
  itemRows: readonly Readonly<ReconciliationItemRow>[],
  manualEntryRow: Readonly<ManualEntryRow> | null = null,
): Result<Reconciliation, ReconciliationMapperError> => {
  const id = ReconciliationId.rehydrate(row.id);
  if (!id.ok) return err('invalid-reconciliation-id');

  const transactionId = StatementTransactionId.rehydrate(row.transactionId);
  if (!transactionId.ok) return err('invalid-reconciliation-transaction-id');

  const type = toType(row.type);
  if (type === null) return err('invalid-reconciliation-type');

  const status = toStatus(row.status);
  if (status === null) return err('invalid-reconciliation-status');

  let difference: Difference | null = null;
  if (row.differenceValueCents !== null || row.differenceTreatment !== null) {
    if (row.differenceValueCents === null || row.differenceTreatment === null) {
      return err('invalid-reconciliation-difference');
    }
    const treatment = toTreatment(row.differenceTreatment);
    if (treatment === null) return err('invalid-reconciliation-difference');
    difference = { valueCents: row.differenceValueCents, treatment };
  }

  const items: ReconciliationItem[] = [];
  for (const ir of itemRows) {
    const payableId = PayableId.rehydrate(ir.payableId);
    if (!payableId.ok) return err('invalid-reconciliation-payable-id');
    items.push({ payableId: payableId.value, reconciledValueCents: ir.reconciledValueCents });
  }

  // Reidrata o lançamento manual quando a linha é fornecida (detalhe da conciliação — categoria etc.).
  // Sem a linha, segue `null` (undo e demais caminhos não precisam do boundary pós-criação).
  let manualEntry: ManualEntry | null = null;
  if (manualEntryRow !== null) {
    const me = manualEntryRowToDomain(manualEntryRow);
    if (!me.ok) return err(me.error);
    manualEntry = me.value;
  }

  return ok(
    immutable<Reconciliation>({
      id: id.value,
      transactionId: transactionId.value,
      type,
      status,
      items,
      difference,
      manualEntry,
      audit: {
        reconciledAt: row.reconciledAt,
        reconciledBy: row.reconciledBy,
        undoneAt: row.undoneAt,
        undoneBy: row.undoneBy,
        undoReason: row.undoReason,
      },
    }),
  );
};
