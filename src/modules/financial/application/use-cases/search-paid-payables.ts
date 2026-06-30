import type { Result } from '../../../../shared/primitives/result.ts';
import type {
  PaidPayableView,
  PayableReconciliationView,
  PayableReconciliationViewError,
} from '../ports/payable-reconciliation-view.ts';

export type SearchPaidPayablesDeps = Readonly<{
  payables: Pick<PayableReconciliationView, 'searchPaid'>;
}>;

// Sem filtros nesta fatia (US2): a borda expõe só `?status=Paid`. Filtros (conta/período) entram no read-model #139.
export type SearchPaidPayablesInput = Readonly<Record<string, never>>;

// Read puro: repassa o Result do view (await explícito p/ satisfazer promise-function-async).
export const searchPaidPayables =
  (deps: SearchPaidPayablesDeps) =>
  async (
    _input: SearchPaidPayablesInput,
  ): Promise<Result<readonly PaidPayableView[], PayableReconciliationViewError>> => {
    const result = await deps.payables.searchPaid();
    return result;
  };
