import type { Result } from '#src/shared/primitives/result.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type { ReconciliationId } from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import type { StatementTransactionId } from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import type { ExpectedCounterpartId } from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import type { ExpectedCounterpart } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import type { ExpectedCounterpartEvent } from '#src/modules/financial/domain/expected-counterpart/events.ts';

// Port da contrapartida esperada (#269). `save` recebe os eventos de domínio e os publica no outbox na
// MESMA unit-of-work do INSERT (produtor — ADR-0015): o adapter Drizzle faz na tx; o in-memory espelha
// a atomicidade contra um outbox interno.
export type ExpectedCounterpartStoreError = 'expected-counterpart-store-unavailable';

export type ExpectedCounterpartStore = Readonly<{
  save: (
    counterpart: ExpectedCounterpart,
    events?: readonly ExpectedCounterpartEvent[],
  ) => Promise<Result<void, ExpectedCounterpartStoreError>>;
  findById: (
    id: ExpectedCounterpartId,
  ) => Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>>;
  listPendingByAccount: (
    accountRef: CedenteAccountId,
  ) => Promise<Result<readonly ExpectedCounterpart[], ExpectedCounterpartStoreError>>;
  findByOriginReconciliation: (
    reconciliationRef: ReconciliationId,
  ) => Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>>;
  // #450: localiza a contrapartida PELA PERNA DE DESTINO — a transação real que a casou
  // (`matched_transaction_ref`). Destrava o undo da perna B: sem isto, desfazer B deixava a
  // contrapartida presa em `Matched`. Retorna `null` se nenhuma contrapartida referencia a transação.
  findByMatchedTransaction: (
    transactionRef: StatementTransactionId,
  ) => Promise<Result<ExpectedCounterpart | null, ExpectedCounterpartStoreError>>;
}>;
