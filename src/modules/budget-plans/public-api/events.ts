import type { BudgetPlanEvent } from '../domain/budget-plan/events.ts';

// Contrato público de eventos do módulo budget-plans (ADR-0006). Único agregado por
// ora, então a união do módulo é a do agregado (molde: programs/public-api/events.ts).

export const BUDGET_PLANS_SCHEMA_VERSION = 1 as const;

export type BudgetPlansModuleEvent = BudgetPlanEvent;

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set<string>(['BudgetPlanCreated']);

export const isBudgetPlansModuleEvent = (u: unknown): u is BudgetPlansModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const candidate = u as { type?: unknown };
  return typeof candidate.type === 'string' && KNOWN_EVENT_TYPES.has(candidate.type);
};
