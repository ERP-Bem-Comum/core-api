import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { BudgetResult } from './budget-result.ts';

// Port de persistência do lançamento calculado. Sem outbox (esta fatia não emite evento — YAGNI).
export type BudgetResultRepositoryError =
  | 'budget-result-repo-unavailable'
  | 'budget-result-corrupt';

export type BudgetResultRepository = Readonly<{
  // Upsert por (budgetId, subcategoryId, month) — #413. Recalcular o mesmo mês ATUALIZA o valor;
  // não acrescenta linha. Chamava-se `add` (INSERT puro), mas a semântica deixou de ser
  // "acrescentar" quando o mês virou identidade: sem isso, recalcular contava EM DOBRO.
  //
  // Devolve o registro EFETIVAMENTE PERSISTIDO, não a entrada: no recálculo o upsert preserva o id
  // da linha existente, então o id de quem chamou é descartado. Quem devolvesse a entrada faria a
  // response 201 anunciar um id que não existe no banco.
  save: (result: BudgetResult) => Promise<Result<BudgetResult, BudgetResultRepositoryError>>;
  // CA3 (leitura por orçamento) + round-trip. Ordem determinística (por id) fica a cargo do adapter.
  listByBudgetId: (
    budgetId: BudgetId,
  ) => Promise<Result<readonly BudgetResult[], BudgetResultRepositoryError>>;
  // CA4: apagar o orçamento remove seus resultados (delete explícito, D2 — sem FK cascade).
  deleteByBudgetId: (budgetId: BudgetId) => Promise<Result<void, BudgetResultRepositoryError>>;
}>;
