import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

import * as ManualEntryId from './manual-entry-id.ts';
import type { ReconciliationError } from './errors.ts';
import type { PayableReconciled, ReconciliationEvent } from './events.ts';
import type {
  ConfirmInput,
  ConfirmOutput,
  Difference,
  ManualEntry,
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

// #141/#247: o sinal de `valueCents` deve casar com o tratamento. `Discount`/`Partial` (transação <
// títulos, saldo aberto/abatimento) exigem < 0; `Interest`/`Penalty`/`Fee` (transação > títulos)
// exigem > 0. Switch exausto sobre DifferenceTreatment.
const isSignCoherent = (difference: Difference): boolean => {
  switch (difference.treatment) {
    case 'Discount':
    case 'Partial':
      return difference.valueCents < 0;
    case 'Interest':
    case 'Penalty':
    case 'Fee':
      return difference.valueCents > 0;
  }
};

// #141/#247 (decisão b): a diferença CLASSIFICADA (`Interest|Penalty|Fee|Discount`) gera um `ManualEntry`
// vinculado à conciliação, carregando a classificação contábil informada no confirm. `Partial` (saldo
// aberto) NÃO gera lançamento — devolve null. Reuso do VO ManualEntry (sem agregado novo).
const buildDifferenceManualEntry = (difference: Difference): ManualEntry | null => {
  if (difference.treatment === 'Partial') return null;
  return immutable<ManualEntry>({
    id: ManualEntryId.generate(),
    type: 'FeePenaltyInterest',
    valueCents: difference.valueCents,
    supplierRef: null,
    // #502/S2: a diferença classificada não carrega taxonomia planejável (plano/subcategoria) — null.
    budgetPlanRef: null,
    subcategoryRef: null,
    categoryRef: difference.categoryRef ?? null,
    costCenterRef: difference.costCenterRef ?? null,
    programRef: null,
    description: difference.note ?? null,
    destinationAccountRef: null,
    productLabel: null,
    // #370: a diferença classificada é gerada da conciliação, sem documento próprio.
    documentNumber: null,
    documentType: null,
    issueDate: null,
    documentValueCents: null,
  });
};

// Confirma a conciliação: valida pré-condição (R2: títulos `Paid`) e fechamento 100% (R3: soma dos
// títulos + diferença = valor da transação). Emite `PayableReconciled` por título. Nunca automático
// (R1) — esta operação só roda sob comando explícito do operador (use-case #123).
export const confirm = (input: ConfirmInput): Result<ConfirmOutput, ReconciliationError> => {
  if (input.payables.length === 0) return err('empty-reconciliation');

  if (!input.payables.every((payable) => payable.status === 'Paid')) {
    return err('title-not-paid');
  }

  // CA5: sinal da diferença classificada deve casar com o tratamento.
  if (input.difference !== undefined && !isSignCoherent(input.difference)) {
    return err('difference-sign-invalid');
  }

  // #141/#247: `reconciledValueCents` por item = valor REAL alocado (input), com fallback ao valor
  // cheio do título quando não há alocação (CA1 back-compat).
  const allocationByPayable = new Map(
    (input.allocations ?? []).map((a) => [String(a.payableId), a.reconciledValueCents]),
  );
  const items: readonly ReconciliationItem[] = input.payables.map((payable) => ({
    payableId: payable.id,
    reconciledValueCents: allocationByPayable.get(String(payable.id)) ?? payable.valueCents,
  }));

  // R3 dependente do tratamento: `Partial` descreve o SALDO ABERTO (transação === Σ itens; a diferença
  // não entra no fechamento). Demais tratamentos abatem/somam o gap transação↔títulos.
  const itemsSum = items.reduce((acc, item) => acc + item.reconciledValueCents, 0);
  const balanceContribution =
    input.difference !== undefined && input.difference.treatment !== 'Partial'
      ? input.difference.valueCents
      : 0;
  if (itemsSum + balanceContribution !== input.transactionValueCents) {
    return err('reconciliation-not-balanced');
  }

  const manualEntry =
    input.difference !== undefined ? buildDifferenceManualEntry(input.difference) : null;

  const reconciliation: Reconciliation = immutable<Reconciliation>({
    id: input.reconciliationId,
    transactionId: input.transactionId,
    type: deriveType(items.length, input.difference !== undefined),
    status: 'Active',
    items,
    difference: input.difference ?? null,
    manualEntry,
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
