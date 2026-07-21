import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

import * as ManualEntryId from './manual-entry-id.ts';
import type { ReconciliationId } from './reconciliation-id.ts';
import type { StatementTransactionId } from '../statement/statement-transaction-id.ts';
import type { ManualEntryRecorded, ReconciliationEvent } from './events.ts';
import type { ManualEntry, ManualEntryType, Reconciliation } from './types.ts';

// Lançamento manual (US5): concilia uma transação SEM título (ex.: tarifa), criando uma `Reconciliation`
// tipo `ManualEntry` (items vazio) e o registro contábil `ManualEntry` no boundary. Nunca automático (R1).

export type ManualEntryError =
  | 'manual-entry-value-not-positive'
  | 'transfer-requires-destination'
  | 'investment-requires-product'
  | 'realloc-forbids-supplier';

// #143: tipos de realocação patrimonial (não despesa/receita) — derivado do tipo, sem flag extra.
export const isCapitalReallocation = (type: ManualEntryType): boolean =>
  type === 'Transfer' || type === 'Investment' || type === 'Redemption';

export type ConfirmManualEntryInput = Readonly<{
  reconciliationId: ReconciliationId;
  transactionId: StatementTransactionId;
  type: ManualEntryType;
  valueCents: number;
  supplierRef?: string;
  // #502/S2: plano orçamentário + subcategoria (folha) no título manual.
  budgetPlanRef?: string;
  subcategoryRef?: string;
  categoryRef?: string;
  costCenterRef?: string;
  programRef?: string;
  description?: string;
  destinationAccountRef?: string;
  productLabel?: string;
  reconciledBy: string;
  occurredAt: Date;
}>;

export type ConfirmManualEntryOutput = Readonly<{
  reconciliation: Reconciliation;
  manualEntry: ManualEntry;
  events: readonly ReconciliationEvent[];
}>;

export const confirmManualEntry = (
  input: ConfirmManualEntryInput,
): Result<ConfirmManualEntryOutput, ManualEntryError> => {
  if (input.valueCents <= 0) return err('manual-entry-value-not-positive');

  // #143: guards de realocação patrimonial (Transfer/Investment/Redemption).
  if (isCapitalReallocation(input.type) && input.supplierRef !== undefined) {
    return err('realloc-forbids-supplier');
  }
  if (input.type === 'Transfer' && input.destinationAccountRef === undefined) {
    return err('transfer-requires-destination');
  }
  if (
    (input.type === 'Investment' || input.type === 'Redemption') &&
    input.productLabel === undefined
  ) {
    return err('investment-requires-product');
  }

  const manualEntry: ManualEntry = immutable<ManualEntry>({
    id: ManualEntryId.generate(),
    type: input.type,
    valueCents: input.valueCents,
    supplierRef: input.supplierRef ?? null,
    budgetPlanRef: input.budgetPlanRef ?? null,
    subcategoryRef: input.subcategoryRef ?? null,
    categoryRef: input.categoryRef ?? null,
    costCenterRef: input.costCenterRef ?? null,
    programRef: input.programRef ?? null,
    description: input.description ?? null,
    destinationAccountRef: input.destinationAccountRef ?? null,
    productLabel: input.productLabel ?? null,
  });

  const reconciliation: Reconciliation = immutable<Reconciliation>({
    id: input.reconciliationId,
    transactionId: input.transactionId,
    type: 'ManualEntry',
    status: 'Active',
    items: [],
    difference: null,
    manualEntry,
    audit: {
      reconciledAt: input.occurredAt,
      reconciledBy: input.reconciledBy,
      undoneAt: null,
      undoneBy: null,
      undoReason: null,
    },
  });

  const events: readonly ReconciliationEvent[] = [
    {
      type: 'ManualEntryRecorded',
      reconciliationId: input.reconciliationId,
      transactionId: input.transactionId,
      manualEntryId: manualEntry.id,
      manualEntryType: manualEntry.type,
      valueCents: manualEntry.valueCents,
      occurredAt: input.occurredAt,
    } satisfies ManualEntryRecorded,
  ];

  return ok(immutable<ConfirmManualEntryOutput>({ reconciliation, manualEntry, events }));
};
