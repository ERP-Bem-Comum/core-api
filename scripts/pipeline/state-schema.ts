/**
 * Pipeline state schema v1 — types canônicos + parser via Result<T, E>.
 *
 * Ticket: CTR-PIPELINE-STATE-JSON (W1).
 *
 * STATE.json é canônico; STATE.md é gerado por `render-state-md.ts`.
 */

import { type Result, ok, err } from '../../src/shared/primitives/result.ts';

export const PIPELINE_STATE_SCHEMA_VERSION = 1 as const;

export const WAVE_IDS = ['W0', 'W1', 'W2', 'W3'] as const;
export type WaveId = (typeof WAVE_IDS)[number];

export type WaveOutcome = 'RED' | 'GREEN' | 'APPROVED' | 'REJECTED' | 'ALL-GREEN';
export type WaveStatus = 'pending' | 'in-progress' | 'done' | 'failed';

export type WaveEntry = Readonly<{
  id: WaveId;
  status: WaveStatus;
  agent: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  rounds: number;
  reportPath: string | null;
  outcome: WaveOutcome | null;
}>;

export type TicketStatus = 'open' | 'in-progress' | 'closed-green' | 'closed-rejected' | 'blocked';

export type TicketSize = 'XS' | 'S' | 'M' | 'L' | 'XL';

export type PipelineState = Readonly<{
  schemaVersion: typeof PIPELINE_STATE_SCHEMA_VERSION;
  ticket: string;
  size: TicketSize;
  createdAt: string;
  closedAt: string | null;
  currentWave: WaveId | null;
  status: TicketStatus;
  waves: readonly WaveEntry[];
  blockers: readonly string[];
  lastEvent: string;
}>;

export type ParseError =
  | Readonly<{ tag: 'InvalidJson'; reason: string }>
  | Readonly<{ tag: 'SchemaVersionMismatch'; expected: number; actual: unknown }>
  | Readonly<{ tag: 'MissingField'; field: string }>
  | Readonly<{ tag: 'InvalidFieldType'; field: string; expected: string; actual: string }>;

const REQUIRED_FIELDS: readonly string[] = [
  'ticket',
  'size',
  'createdAt',
  'closedAt',
  'currentWave',
  'status',
  'waves',
  'blockers',
  'lastEvent',
];

const isObject = (u: unknown): u is Record<string, unknown> =>
  typeof u === 'object' && u !== null && !Array.isArray(u);

const tryParseJson = (raw: string): Result<unknown, ParseError> => {
  try {
    return ok(JSON.parse(raw));
  } catch (e) {
    return err({ tag: 'InvalidJson', reason: (e as Error).message });
  }
};

export const parsePipelineState = (raw: string): Result<PipelineState, ParseError> => {
  const jsonResult = tryParseJson(raw);
  if (!jsonResult.ok) return jsonResult;
  const parsed = jsonResult.value;

  if (!isObject(parsed)) {
    return err({ tag: 'InvalidJson', reason: 'root is not a JSON object' });
  }

  if (!('schemaVersion' in parsed)) {
    return err({ tag: 'MissingField', field: 'schemaVersion' });
  }
  if (parsed['schemaVersion'] !== PIPELINE_STATE_SCHEMA_VERSION) {
    return err({
      tag: 'SchemaVersionMismatch',
      expected: PIPELINE_STATE_SCHEMA_VERSION,
      actual: parsed['schemaVersion'],
    });
  }

  for (const field of REQUIRED_FIELDS) {
    if (!(field in parsed)) {
      return err({ tag: 'MissingField', field });
    }
  }

  return ok(parsed as unknown as PipelineState);
};
