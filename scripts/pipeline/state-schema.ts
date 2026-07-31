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

/**
 * Autorização humana explícita que destrava uma wave já no teto de `MAX_ROUNDS`.
 * Gravada por `pipeline:state wave-override` (PIPELINE-STATE-WAVE-OVERRIDE) para
 * que a exceção fique auditável no canônico, sem depender do histórico do git.
 *
 * `roundsAtOverride` é o valor de `rounds` ANTES do incremento — a evidência de
 * que o teto estava de fato esgotado quando a autorização foi dada.
 */
export type WaveOverride = Readonly<{
  reason: string;
  authorizedAt: string;
  roundsAtOverride: number;
}>;

export type WaveEntry = Readonly<{
  id: WaveId;
  status: WaveStatus;
  agent: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  rounds: number;
  reportPath: string | null;
  outcome: WaveOutcome | null;
  // `overrides` é o LEDGER APPEND-ONLY — a trilha de auditoria. Uma wave pode ser
  // destravada mais de uma vez (o round autorizado também pode ser REJECTED), e
  // cada autorização é anexada, nunca sobrescrita: `git log` não recupera as
  // perdidas, porque STATE.json é commitado ~1× por PR, não a cada transição.
  //
  // `override` é a PROJEÇÃO da autorização em vigor — sempre idêntico a
  // `overrides.at(-1)`. Existe porque o contrato do W0 (CA3) lê o registro por
  // esse nome; ambos são escritos por um único ponto (`appendOverride`), o que
  // torna a divergência entre os dois impossível por construção.
  //
  // Os dois são opcionais (`?:`) e não obrigatórios `T | null`: sob
  // `exactOptionalPropertyTypes` um campo obrigatório invalidaria todo literal de
  // `WaveEntry` já existente (fixtures de teste, `cmdInit`) e quebraria os
  // leitores de STATE.json legados.
  override?: WaveOverride | null;
  overrides?: readonly WaveOverride[];
}>;

export type TicketStatus =
  | 'open'
  | 'in-progress'
  | 'closed-green'
  | 'closed-rejected'
  | 'superseded'
  | 'blocked';

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
  // Presente apenas quando status === 'superseded'. Campo opcional para
  // retrocompatibilidade com STATE.json legados (não entra em REQUIRED_FIELDS).
  supersededBy?: string;
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
