import type { ProgramEvent } from '../domain/program/events.ts';

// Contrato público de eventos do módulo programs (ADR-0006). Único agregado por ora,
// então a união do módulo é a do agregado. Decoder versionado entra com a fatia Drizzle.

export const PROGRAMS_SCHEMA_VERSION = 1 as const;

export type ProgramsModuleEvent = ProgramEvent;

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set<string>([
  'ProgramCreated',
  'ProgramUpdated',
  'ProgramDeactivated',
  'ProgramReactivated',
]);

export const isProgramsModuleEvent = (u: unknown): u is ProgramsModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const candidate = u as { type?: unknown };
  return typeof candidate.type === 'string' && KNOWN_EVENT_TYPES.has(candidate.type);
};
