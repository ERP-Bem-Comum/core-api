import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type {
  ExpectedCounterpart,
  ExpectedCounterpartStatus,
  ExpectedCounterpartType,
} from '#src/modules/financial/domain/expected-counterpart/types.ts';
import type { Movement } from '#src/modules/financial/domain/statement/types.ts';
import type {
  ExpectedCounterpartRow,
  NewExpectedCounterpartRow,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

// Mapper row ↔ domínio (`.claude/rules/adapters.md`): `toDomain` retorna `Result` — o domínio rejeita
// estado inválido vindo do banco (id não-UUID, status/type/movement fora do union). `valueCents` é
// bigint no domínio e number na row (bigint mode:'number'); converte nos dois sentidos.
export type ExpectedCounterpartMapperError =
  | 'invalid-expected-counterpart-id'
  | 'invalid-expected-counterpart-destination'
  | 'invalid-expected-counterpart-origin-account'
  | 'invalid-expected-counterpart-reconciliation'
  | 'invalid-expected-counterpart-status'
  | 'invalid-expected-counterpart-type'
  | 'invalid-expected-counterpart-movement';

const toStatus = (raw: string): ExpectedCounterpartStatus | null =>
  raw === 'Pending' || raw === 'Matched' || raw === 'Discarded' ? raw : null;

const toType = (raw: string): ExpectedCounterpartType | null => (raw === 'Transfer' ? raw : null);

const toMovement = (raw: string): Movement | null =>
  raw === 'Debit' || raw === 'Credit' ? raw : null;

export const toRow = (c: ExpectedCounterpart, now: Date): NewExpectedCounterpartRow => ({
  id: String(c.id),
  destinationAccountRef: String(c.destinationAccountRef),
  originAccountRef: String(c.originAccountRef),
  originReconciliationRef: String(c.originReconciliationRef),
  originTransactionRef: c.originTransactionRef,
  type: c.type,
  movement: c.movement,
  valueCents: Number(c.valueCents),
  expectedDate: c.expectedDate,
  status: c.status,
  matchedTransactionRef: c.matchedTransactionRef,
  createdAt: now,
  updatedAt: now,
});

export const toDomain = (
  row: Readonly<ExpectedCounterpartRow>,
): Result<ExpectedCounterpart, ExpectedCounterpartMapperError> => {
  const id = ExpectedCounterpartId.rehydrate(row.id);
  if (!id.ok) return err('invalid-expected-counterpart-id');
  const destination = CedenteAccountId.rehydrate(row.destinationAccountRef);
  if (!destination.ok) return err('invalid-expected-counterpart-destination');
  const origin = CedenteAccountId.rehydrate(row.originAccountRef);
  if (!origin.ok) return err('invalid-expected-counterpart-origin-account');
  const reconciliation = ReconciliationId.rehydrate(row.originReconciliationRef);
  if (!reconciliation.ok) return err('invalid-expected-counterpart-reconciliation');

  const status = toStatus(row.status);
  if (status === null) return err('invalid-expected-counterpart-status');
  const type = toType(row.type);
  if (type === null) return err('invalid-expected-counterpart-type');
  const movement = toMovement(row.movement);
  if (movement === null) return err('invalid-expected-counterpart-movement');

  return ok(
    immutable<ExpectedCounterpart>({
      id: id.value,
      destinationAccountRef: destination.value,
      originAccountRef: origin.value,
      originReconciliationRef: reconciliation.value,
      originTransactionRef: row.originTransactionRef,
      type,
      movement,
      valueCents: BigInt(row.valueCents),
      expectedDate: row.expectedDate,
      status,
      matchedTransactionRef: row.matchedTransactionRef,
    }),
  );
};
