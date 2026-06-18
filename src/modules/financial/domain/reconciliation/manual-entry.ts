import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

import * as ManualEntryId from './manual-entry-id.ts';
import type { ReconciliationId } from './reconciliation-id.ts';
import type { StatementTransactionId } from '../statement/statement-transaction-id.ts';
import type { ManualEntryRecorded, ReconciliationEvent } from './events.ts';
import type { ManualEntry, ManualEntryType, Reconciliation } from './types.ts';

// Lançamento manual (US5): concilia uma transação SEM título (ex.: tarifa), criando uma `Reconciliation`
// tipo `ManualEntry` (items vazio) e o registro contábil `ManualEntry` no boundary. Nunca automático (R1).

export type ManualEntryError = 'manual-entry-value-not-positive';

export type ConfirmManualEntryInput = Readonly<{
  reconciliationId: ReconciliationId;
  transactionId: StatementTransactionId;
  type: ManualEntryType;
  valueCents: number;
  supplierRef?: string;
  categoryRef?: string;
  costCenterRef?: string;
  programRef?: string;
  description?: string;
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

  const manualEntry: ManualEntry = immutable<ManualEntry>({
    id: ManualEntryId.generate(),
    type: input.type,
    valueCents: input.valueCents,
    supplierRef: input.supplierRef ?? null,
    categoryRef: input.categoryRef ?? null,
    costCenterRef: input.costCenterRef ?? null,
    programRef: input.programRef ?? null,
    description: input.description ?? null,
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
