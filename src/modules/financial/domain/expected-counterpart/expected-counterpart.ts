import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { Movement } from '#src/modules/financial/domain/statement/types.ts';
import type { ExpectedCounterpartId } from './expected-counterpart-id.ts';
import type { ExpectedCounterpart, ExpectedCounterpartError } from './types.ts';
import type {
  ExpectedCounterpartEvent,
  TransferCounterpartCreated,
  TransferCounterpartMatched,
  TransferCounterpartDiscarded,
} from './events.ts';

// US1 (#269): cria a contrapartida esperada na conta de destino de uma transferência A→B. A perna
// esperada tem movimento OPOSTO ao da origem (Debit em A → Credit esperado em B) e espelha o valor.

export type CreateExpectedCounterpartInput = Readonly<{
  id: ExpectedCounterpartId;
  destinationAccountRef: CedenteAccountId;
  originAccountRef: CedenteAccountId;
  originReconciliationRef: ReconciliationId;
  originTransactionRef: string;
  originMovement: Movement;
  valueCents: bigint;
  expectedDate: Date;
}>;

export type CreateExpectedCounterpartOutput = Readonly<{
  counterpart: ExpectedCounterpart;
  events: readonly ExpectedCounterpartEvent[];
}>;

const opposite = (movement: Movement): Movement => (movement === 'Debit' ? 'Credit' : 'Debit');

export const create = (
  input: CreateExpectedCounterpartInput,
): Result<CreateExpectedCounterpartOutput, ExpectedCounterpartError> => {
  if (input.valueCents <= 0n) return err('counterpart-value-invalid');
  if (String(input.destinationAccountRef) === String(input.originAccountRef)) {
    return err('counterpart-same-account');
  }

  const counterpart = immutable<ExpectedCounterpart>({
    id: input.id,
    destinationAccountRef: input.destinationAccountRef,
    originAccountRef: input.originAccountRef,
    originReconciliationRef: input.originReconciliationRef,
    originTransactionRef: input.originTransactionRef,
    type: 'Transfer',
    movement: opposite(input.originMovement),
    valueCents: input.valueCents,
    expectedDate: input.expectedDate,
    status: 'Pending',
    matchedTransactionRef: null,
  });

  const created: TransferCounterpartCreated = {
    type: 'TransferCounterpartCreated',
    counterpartId: counterpart.id,
    destinationAccountRef: counterpart.destinationAccountRef,
    originAccountRef: counterpart.originAccountRef,
    originReconciliationRef: counterpart.originReconciliationRef,
    valueCents: Number(counterpart.valueCents),
    movement: counterpart.movement,
    expectedDate: counterpart.expectedDate,
  };

  return ok({ counterpart, events: [created] });
};

export type MatchExpectedCounterpartOutput = Readonly<{
  counterpart: ExpectedCounterpart;
  events: readonly ExpectedCounterpartEvent[];
}>;

// US2 (#269): consome a contrapartida quando o extrato real da conta de destino casa. Exige `Pending`
// (Matched/Discarded são terminais → `counterpart-not-pending`). Grava a transação real que a consumiu
// (`matchedTransactionRef`) — dedup e vínculo A↔B (originReconciliationRef=A, matchedTransactionRef=B).
export const match = (
  counterpart: ExpectedCounterpart,
  matchedTransactionRef: string,
): Result<MatchExpectedCounterpartOutput, ExpectedCounterpartError> => {
  if (counterpart.status !== 'Pending') return err('counterpart-not-pending');

  const matched = immutable<ExpectedCounterpart>({
    ...counterpart,
    status: 'Matched',
    matchedTransactionRef,
  });

  const event: TransferCounterpartMatched = {
    type: 'TransferCounterpartMatched',
    counterpartId: matched.id,
    matchedTransactionRef,
    destinationAccountRef: matched.destinationAccountRef,
  };

  return ok({ counterpart: matched, events: [event] });
};

// US3 (#269): desfazer a conciliação de origem (A) trata a contrapartida em B. `discard` (Pending →
// Discarded, terminal) quando a contrapartida nunca foi casada; `reopen` (Matched → Pending, libera
// novo match) quando a perna casada de B é desfeita junto.
export const discard = (
  counterpart: ExpectedCounterpart,
): Result<MatchExpectedCounterpartOutput, ExpectedCounterpartError> => {
  if (counterpart.status !== 'Pending') return err('counterpart-not-pending');

  const discarded = immutable<ExpectedCounterpart>({ ...counterpart, status: 'Discarded' });
  const event: TransferCounterpartDiscarded = {
    type: 'TransferCounterpartDiscarded',
    counterpartId: discarded.id,
    reason: 'undo-origin',
  };
  return ok({ counterpart: discarded, events: [event] });
};

export const reopen = (
  counterpart: ExpectedCounterpart,
): Result<MatchExpectedCounterpartOutput, ExpectedCounterpartError> => {
  if (counterpart.status !== 'Matched') return err('counterpart-not-matched');

  // Volta a Pending e solta a transação real que a consumira — a perna B pode ser re-conciliada.
  const reopened = immutable<ExpectedCounterpart>({
    ...counterpart,
    status: 'Pending',
    matchedTransactionRef: null,
  });
  // Reabertura não tem evento próprio no contrato (Created/Matched/Discarded); o ReconciliationUndone
  // da perna B (desfeita no mesmo undo) carrega a trilha de auditoria.
  return ok({ counterpart: reopened, events: [] });
};
