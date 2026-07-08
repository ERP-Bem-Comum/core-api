/**
 * Catálogo de permissions do recurso budget-plan (RBAC) — módulo budget-plans.
 *
 * SSoT das permissions `resource:action` expostas pela borda HTTP de Planos Orçamentários.
 * Consumido pelo plugin (`adapters/http/plugin.ts`) e pelo seed RBAC dev/test.
 * Espelha `programs/public-api/permissions.ts`. As strings devem existir no catálogo
 * global (`auth/domain/authorization/permission-catalog.ts`).
 */

export const BUDGET_PLAN_PERMISSION = {
  read: 'budget-plan:read',
  write: 'budget-plan:write',
} as const;

export type BudgetPlanPermission =
  (typeof BUDGET_PLAN_PERMISSION)[keyof typeof BUDGET_PLAN_PERMISSION];
