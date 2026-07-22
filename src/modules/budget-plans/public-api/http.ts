/**
 * Ponto público HTTP do módulo budget-plans (ADR-0006/0025/0028, issue #315).
 *
 * Único ponto de import externo da borda HTTP do módulo — o composition root
 * (`src/server.ts`) importa daqui:
 *  - `buildBudgetPlansHttpDeps(config)`: monta adapters por driver e instancia os use cases;
 *  - `budgetPlansHttpPlugin(deps, { requireAuth, authorize })`: factory do plugin Fastify
 *    (rotas sob /budget-plans, registradas pelo root sob /api/v2 — plugin direto).
 *
 * Separado do barrel `events.ts` de propósito: importar este módulo arrasta Fastify, que
 * não deve alcançar consumidores de evento.
 */

export { budgetPlansHttpPlugin } from '../adapters/http/plugin.ts';
export type { BudgetPlansHttpHooks } from '../adapters/http/plugin.ts';
export { buildBudgetPlansHttpDeps } from '../adapters/http/composition.ts';
export { parseE2eBudgetPlansSeed } from '../adapters/http/e2e-seed.ts';
export type {
  BudgetPlansHttpDeps,
  BudgetPlansCompositionConfig,
  BudgetPlansSeed,
} from '../adapters/http/composition.ts';
export { BUDGET_PLAN_PERMISSION } from './permissions.ts';
export type { BudgetPlanPermission } from './permissions.ts';
