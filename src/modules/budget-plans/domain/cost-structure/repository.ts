import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { BudgetPlanStatus } from '../budget-plan/status.ts';
import type { CostStructure } from './types.ts';
import type { CostStructureError } from './errors.ts';

// Port de persistência da árvore de custos. Molde do BudgetPlanRepositoryError, mas
// SEM outbox: esta fatia é só estrutura (nós), não emite eventos de domínio (YAGNI).
export type CostStructureRepositoryError = 'cost-structure-repo-unavailable';

// Callback de escrita guardada: recebe a árvore atual + o status do plano (lido por FORA
// da árvore) e devolve a nova árvore ou o erro de domínio. O status habilita o guard de
// editabilidade DENTRO da mesma transação (fecha o TOCTOU — Q4).
export type CostStructureMutation = (
  structure: CostStructure,
  planStatus: BudgetPlanStatus,
) => Result<CostStructure, CostStructureError>;

// União de erro do `mutate`: infra + domínio + ausência do plano (não há linha de status).
export type CostStructureMutateError =
  | CostStructureRepositoryError
  | CostStructureError
  | 'budget-plan-not-found';

export type CostStructureRepository = Readonly<{
  // Reconstrói a árvore do plano. A árvore VAZIA é válida: plano sem nós retorna
  // `empty(id)` — NUNCA null (o chamador não precisa distinguir "sem plano" de "sem nós").
  findByBudgetPlanId: (
    id: BudgetPlanId,
  ) => Promise<Result<CostStructure, CostStructureRepositoryError>>;
  // Escrita ATÔMICA guardada por status: lê o status do plano (FOR UPDATE no writer real),
  // carrega a árvore, aplica `apply` e reescreve — tudo no MESMO commit. É o único caminho
  // de escrita da árvore exposto ao application (fecha a race read-check-write).
  mutate: (
    budgetPlanId: BudgetPlanId,
    apply: CostStructureMutation,
  ) => Promise<Result<CostStructure, CostStructureMutateError>>;
  // Replace-all primitivo (low-level), NÃO guardado por status: apaga a árvore inteira do
  // plano e reinsere. Usado por seeds/round-trip; o caminho de negócio é `mutate`.
  save: (structure: CostStructure) => Promise<Result<void, CostStructureRepositoryError>>;
}>;
