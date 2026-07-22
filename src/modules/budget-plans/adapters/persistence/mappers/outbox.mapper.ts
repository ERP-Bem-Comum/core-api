import { randomUUID } from 'node:crypto';
import type { BudgetPlansModuleEvent } from '#src/modules/budget-plans/public-api/events.ts';
import { BUDGET_PLANS_SCHEMA_VERSION } from '#src/modules/budget-plans/public-api/events.ts';
import type * as schema from '../schemas/mysql.ts';

type OutboxInsert = typeof schema.bgpOutbox.$inferInsert;

// Payload como string (varchar) — sem JSON nativo (ADR-0020). UUID/Date achatados.
const serializeEvent = (event: BudgetPlansModuleEvent): string =>
  JSON.stringify({
    type: event.type,
    budgetPlanId: String(event.budgetPlanId),
    year: event.year,
    programRef: String(event.programRef),
    occurredAt: event.occurredAt.toISOString(),
  });

export const eventToOutboxInsert = (
  event: BudgetPlansModuleEvent,
  now: Date,
  idGenerator: () => string = randomUUID,
): OutboxInsert => ({
  eventId: idGenerator(),
  aggregateId: String(event.budgetPlanId),
  aggregateType: 'BudgetPlan',
  eventType: event.type,
  schemaVersion: BUDGET_PLANS_SCHEMA_VERSION,
  occurredAt: event.occurredAt,
  enqueuedAt: now,
  processedAt: null,
  attempts: 0,
  payload: serializeEvent(event),
});
