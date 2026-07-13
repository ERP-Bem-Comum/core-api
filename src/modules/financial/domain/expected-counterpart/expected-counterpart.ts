import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { Movement } from '#src/modules/financial/domain/statement/types.ts';
import type { ExpectedCounterpartId } from './expected-counterpart-id.ts';
import type { ExpectedCounterpart, ExpectedCounterpartError } from './types.ts';
import type { ExpectedCounterpartEvent, TransferCounterpartCreated } from './events.ts';

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
