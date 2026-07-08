/**
 * BDG-COST-STRUCTURE — W0 (RED) — apoio dos use cases da árvore de custos (Fatia 2/US2).
 *
 * Constrói o CostStructureRepository in-memory com `readPlanStatus` injetado (novo na W1-B):
 * o status do plano é lido por FORA da árvore (o writer atômico `mutate` decide editabilidade
 * a partir dele). Aqui stubamos o status por plano — sem depender do agregado BudgetPlan,
 * que hoje só nasce RASCUNHO (não há transição p/ APROVADO no domínio).
 */

import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import type { BudgetPlanStatus } from '#src/modules/budget-plans/domain/budget-plan/status.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import type { CostStructureRepository } from '#src/modules/budget-plans/domain/cost-structure/repository.ts';

// Planos-âncora dos testes de use case. UUID v4 válidos (rehydrate passa).
export const RASCUNHO_PLAN = BudgetPlanId.generate();
export const CALIBRACAO_PLAN = BudgetPlanId.generate();
export const APROVADO_PLAN = BudgetPlanId.generate();

// Plano válido no formato, porém AUSENTE do store (readPlanStatus -> null -> not-found).
export const UNKNOWN_PLAN = '00000000-0000-4000-8000-000000000000';
// Fora do formato UUID v4 (rehydrate falha antes de tocar o repo).
export const MALFORMED_PLAN = 'nao-e-uuid';

const STATUS: Readonly<Record<string, BudgetPlanStatus>> = {
  [String(RASCUNHO_PLAN)]: 'RASCUNHO',
  [String(CALIBRACAO_PLAN)]: 'EM_CALIBRACAO',
  [String(APROVADO_PLAN)]: 'APROVADO',
};

/**
 * Repo de estrutura de custo com status semeado. Persiste entre chamadas (mutate encadeado):
 * um teste pode adicionar cost-center e, na sequência, categoria filha na MESMA instância.
 */
export const makeCostStructureRepo = (): CostStructureRepository =>
  InMemoryCostStructureRepository((id) => Promise.resolve(STATUS[String(id)] ?? null)).repo;
