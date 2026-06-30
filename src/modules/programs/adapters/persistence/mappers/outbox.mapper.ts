import { randomUUID } from 'node:crypto';
import type { ProgramsModuleEvent } from '#src/modules/programs/public-api/events.ts';
import { PROGRAMS_SCHEMA_VERSION } from '#src/modules/programs/public-api/events.ts';
import type * as schema from '../schemas/mysql.ts';

type OutboxInsert = typeof schema.prgOutbox.$inferInsert;

// Payload como string (varchar) — sem JSON nativo (ADR-0020). UUID/Date achatados.
const serializeEvent = (event: ProgramsModuleEvent): string =>
  JSON.stringify({
    type: event.type,
    programId: String(event.programId),
    occurredAt: event.occurredAt.toISOString(),
  });

export const eventToOutboxInsert = (
  event: ProgramsModuleEvent,
  now: Date,
  idGenerator: () => string = randomUUID,
): OutboxInsert => ({
  eventId: idGenerator(),
  aggregateId: String(event.programId),
  aggregateType: 'Program',
  eventType: event.type,
  schemaVersion: PROGRAMS_SCHEMA_VERSION,
  occurredAt: event.occurredAt,
  enqueuedAt: now,
  processedAt: null,
  attempts: 0,
  payload: serializeEvent(event),
});
