import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

import type { ReconciliationError } from './errors.ts';
import type { PayableReconciled, ReconciliationEvent } from './events.ts';
import type {
  ConfirmInput,
  ConfirmOutput,
  Reconciliation,
  ReconciliationItem,
  ReconciliationType,
  UndoInput,
  UndoOutput,
} from './types.ts';

const deriveType = (itemCount: number, hasDifference: boolean): ReconciliationType => {
  if (hasDifference) return 'Partial';
  if (itemCount > 1) return 'Multiple';
  return 'Individual';
};

// Confirma a conciliação: valida pré-condição (R2: títulos `Paid`) e fechamento 100% (R3: soma dos
// títulos + diferença = valor da transação). Emite `PayableReconciled` por título. Nunca automático
// (R1) — esta operação só roda sob comando explícito do operador (use-case #123).
export const confirm = (input: ConfirmInput): Result<ConfirmOutput, ReconciliationError> => {
  if (input.payables.length === 0) return err('empty-reconciliation');

  if (!input.payables.every((payable) => payable.status === 'Paid')) {
    return err('title-not-paid');
  }

  const items: readonly ReconciliationItem[] = input.payables.map((payable) => ({
    payableId: payable.id,
    reconciledValueCents: payable.valueCents,
  }));

  const itemsSum = items.reduce((acc, item) => acc + item.reconciledValueCents, 0);
  const differenceValue = input.difference?.valueCents ?? 0;
  if (itemsSum + differenceValue !== input.transactionValueCents) {
    return err('reconciliation-not-balanced');
  }

  const reconciliation: Reconciliation = immutable<Reconciliation>({
    id: input.reconciliationId,
    transactionId: input.transactionId,
    type: deriveType(items.length, input.difference !== undefined),
    status: 'Active',
    items,
    difference: input.difference ?? null,
    manualEntry: null,
    audit: {
      reconciledAt: input.occurredAt,
      reconciledBy: input.reconciledBy,
      undoneAt: null,
      undoneBy: null,
      undoReason: null,
    },
  });

  const events: readonly ReconciliationEvent[] = items.map(
    (item): PayableReconciled => ({
      type: 'PayableReconciled',
      payableId: item.payableId,
      reconciliationId: input.reconciliationId,
      transactionId: input.transactionId,
      reconciledValueCents: item.reconciledValueCents,
      occurredAt: input.occurredAt,
    }),
  );

  return ok(immutable<ConfirmOutput>({ reconciliation, events }));
};

// Desfaz a conciliação (R7): `Active → Undone`, preservando o registro (nunca deleta). Emite
// `ReconciliationUndone`. A reversão do status do título (`Reconciled → Paid`) é orquestrada pelo
// use-case (#123) via `payable.unreconcile`.
export const undo = (
  reconciliation: Reconciliation,
  undoInput: UndoInput,
): Result<UndoOutput, ReconciliationError> => {
  if (reconciliation.status === 'Undone') return err('reconciliation-already-undone');

  const undone: Reconciliation = immutable<Reconciliation>({
    ...reconciliation,
    status: 'Undone',
    audit: {
      ...reconciliation.audit,
      undoneAt: undoInput.occurredAt,
      undoneBy: undoInput.undoneBy,
      undoReason: undoInput.reason ?? null,
    },
  });

  const events: readonly ReconciliationEvent[] = [
    {
      type: 'ReconciliationUndone',
      reconciliationId: reconciliation.id,
      transactionId: reconciliation.transactionId,
      payableIds: reconciliation.items.map((item) => item.payableId),
      occurredAt: undoInput.occurredAt,
    },
  ];

  return ok(immutable<UndoOutput>({ reconciliation: undone, events }));
};
