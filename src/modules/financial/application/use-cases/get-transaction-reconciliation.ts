import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as StatementTransactionId from '../../domain/statement/statement-transaction-id.ts';
import type { StatementTransactionIdError } from '../../domain/statement/statement-transaction-id.ts';
import type { Reconciliation } from '../../domain/reconciliation/types.ts';
import type {
  ReconciliationRepository,
  ReconciliationRepositoryError,
} from '../ports/reconciliation-repository.ts';

export type GetTransactionReconciliationInput = Readonly<{ transactionId: string }>;

export type GetTransactionReconciliationError =
  | 'reconciliation-not-found'
  | StatementTransactionIdError
  | ReconciliationRepositoryError;

type Deps = Readonly<{
  reconciliationRepo: Pick<ReconciliationRepository, 'findActiveByTransaction'>;
}>;

// #175: a conciliação ATIVA de uma transação (destrava o "Desfazer" pós-reload + o modal de detalhes).
export const getTransactionReconciliation =
  (deps: Deps) =>
  async (
    input: GetTransactionReconciliationInput,
  ): Promise<Result<Reconciliation, GetTransactionReconciliationError>> => {
    const id = StatementTransactionId.rehydrate(input.transactionId);
    if (!id.ok) return err(id.error);

    const found = await deps.reconciliationRepo.findActiveByTransaction(id.value);
    if (!found.ok) return err(found.error);
    if (found.value === null) return err('reconciliation-not-found');

    return ok(found.value);
  };
