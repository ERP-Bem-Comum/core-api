/**
 * PUBLIC API do módulo Contratos — único ponto de entrada para outros módulos
 * consumirem eventos publicados via outbox.
 *
 * ADR-0006 §"Modular monolith — Public API por módulo": outros módulos (ex.:
 * Financeiro futuro) devem importar APENAS deste arquivo, nunca de
 * `../domain/` nem `../application/` privados.
 *
 * **NÃO** importe de '../domain/' nem '../application/' a partir de outros módulos.
 * **USE APENAS** este arquivo ou o barrel `./index.ts`.
 *
 * Schema version: 1
 *   - Adicionar variante NUNCA quebra v1 (consumers fazem switch exaustivo).
 *   - Remover/renomear variante exige bump para v2 + decoder v2 mantido lado a lado.
 */

import type { ContractEvent } from '../domain/contract/events.ts';
import type { AmendmentEvent } from '../domain/amendment/events.ts';
import type { DocumentEvent } from '../domain/document/events.ts';
import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import {
  outboxRowToEvent,
  type OutboxMapperError,
  type OutboxRow,
} from '../adapters/persistence/mappers/outbox.mapper.ts';

// ─── Re-export de OutboxRow para o consumer ────────────────────────────────────
// Consumer precisa do tipo para construir/passar a row a decodeContractsModuleEventV1.
// Re-exportar aqui evita import direto de adapters/ por outros módulos.

export type { OutboxRow } from '../adapters/persistence/mappers/outbox.mapper.ts';

// ─── Schema version ────────────────────────────────────────────────────────────

/** Schema version corrente do wire format da outbox. Bump em breaking changes. */
export const CONTRACTS_SCHEMA_VERSION = 1 as const;

// ─── Event union estável ───────────────────────────────────────────────────────

/** Union estável de todos os eventos públicos do módulo Contratos. */
export type ContractsModuleEvent = ContractEvent | AmendmentEvent | DocumentEvent;

// ─── Known event types ────────────────────────────────────────────────────────

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  'ContractCreated',
  'ContractActivated',
  'ContractCancelled',
  'ContractStateUpdated',
  'ContractEnded',
  'AmendmentCreated',
  'AmendmentDocumentAttached',
  'AmendmentHomologated',
  'ContractDocumentAttached',
  'ContractDocumentDeleted',
  'ContractDocumentSuperseded',
]);

// ─── Type guard ────────────────────────────────────────────────────────────────

/**
 * Type guard para borda externa (e.g., webhook listener, HTTP handler).
 *
 * Rejeita: null, primitivos, objetos sem campo `type`, `type` não-string
 * e tipos não reconhecidos no contrato v1.
 */
export const isContractsModuleEvent = (u: unknown): u is ContractsModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const candidate = u as { type?: unknown };
  if (typeof candidate.type !== 'string') return false;
  return KNOWN_EVENT_TYPES.has(candidate.type);
};

// ─── Tagged errors (Padrão D) ─────────────────────────────────────────────────

/** Payload não tem a forma mínima esperada (não-objeto, campo faltando). */
export type DecoderInvalidShape = Readonly<{
  tag: 'DecoderInvalidShape';
  reason: string;
}>;

/** `schemaVersion` da row não bate com `CONTRACTS_SCHEMA_VERSION`. */
export type DecoderSchemaVersionMismatch = Readonly<{
  tag: 'DecoderSchemaVersionMismatch';
  expected: number;
  actual: number;
}>;

/** O mapper interno (`outboxRowToEvent`) rejeitou o payload. */
export type DecoderInvalidPayload = Readonly<{
  tag: 'DecoderInvalidPayload';
  mapperError: OutboxMapperError;
}>;

/** Union de todos os erros possíveis do decoder versionado. */
export type DecoderError =
  | DecoderInvalidShape
  | DecoderSchemaVersionMismatch
  | DecoderInvalidPayload;

// ─── Case constructors (Padrão D) ─────────────────────────────────────────────

export const decoderInvalidShape = (reason: string): DecoderInvalidShape => ({
  tag: 'DecoderInvalidShape',
  reason,
});

export const decoderSchemaVersionMismatch = (
  expected: number,
  actual: number,
): DecoderSchemaVersionMismatch => ({
  tag: 'DecoderSchemaVersionMismatch',
  expected,
  actual,
});

export const decoderInvalidPayload = (mapperError: OutboxMapperError): DecoderInvalidPayload => ({
  tag: 'DecoderInvalidPayload',
  mapperError,
});

// ─── Decoder versionado v1 ────────────────────────────────────────────────────

/**
 * Decoder versionado v1 — recebe uma `OutboxRow` (lida da tabela `ctr_outbox`)
 * e retorna o `ContractsModuleEvent` reidratado.
 *
 * Consumers que recebem rows via worker delivery passam a row aqui para
 * reidratar o evento com tipos do domínio (Money, Period, branded IDs, etc.).
 *
 * Falha com:
 * - `DecoderSchemaVersionMismatch` se `row.schemaVersion !== CONTRACTS_SCHEMA_VERSION`
 * - `DecoderInvalidPayload` se o mapper interno rejeitar o payload
 */
export const decodeContractsModuleEventV1 = (
  row: Readonly<OutboxRow>,
): Result<ContractsModuleEvent, DecoderError> => {
  if (row.schemaVersion !== CONTRACTS_SCHEMA_VERSION) {
    return err(decoderSchemaVersionMismatch(CONTRACTS_SCHEMA_VERSION, row.schemaVersion));
  }
  const mapped = outboxRowToEvent(row);
  if (!mapped.ok) return err(decoderInvalidPayload(mapped.error));
  return ok(mapped.value);
};

// ─── US6a: atribuição de contraparte para o consumidor de contagem (ADR-0046) ──
//
// Lê o `contractorRef` aditivo do payload v1 (estampado pelo `contractEventsToOutboxInserts`).
// Eventos sem contraparte (amendments/documents) → `ok(null)`. NÃO reidrata o evento de domínio
// (que não carrega contraparte) — é uma visão de INTEGRAÇÃO, distinta do decoder de domínio.

export type ContractContractorAttribution = Readonly<{
  contractRef: string;
  contractorRef: Readonly<{ type: string; id: string }>;
  occurredAt: Date;
}>;

const parseJsonSafe = (raw: string): Result<unknown, DecoderError> => {
  try {
    return ok(JSON.parse(raw) as unknown);
  } catch {
    return err(decoderInvalidShape('payload-not-json'));
  }
};

export const decodeContractContractorRefV1 = (
  row: Readonly<{
    eventType: string;
    schemaVersion: number;
    payload: string;
    occurredAt: Date;
  }>,
): Result<ContractContractorAttribution | null, DecoderError> => {
  if (row.schemaVersion !== CONTRACTS_SCHEMA_VERSION) {
    return err(decoderSchemaVersionMismatch(CONTRACTS_SCHEMA_VERSION, row.schemaVersion));
  }
  const parsedR = parseJsonSafe(row.payload);
  if (!parsedR.ok) return parsedR;
  const parsed = parsedR.value;
  if (typeof parsed !== 'object' || parsed === null) {
    return err(decoderInvalidShape('payload-not-an-object'));
  }
  const p = parsed as Record<string, unknown>;
  const ref = p['contractorRef'];
  if (ref === undefined || ref === null) return ok(null); // evento sem contraparte
  if (typeof ref !== 'object') return err(decoderInvalidShape('contractorRef-not-an-object'));
  const r = ref as Record<string, unknown>;
  if (typeof r['type'] !== 'string' || typeof r['id'] !== 'string') {
    return err(decoderInvalidShape('contractorRef-missing-fields'));
  }
  if (typeof p['contractId'] !== 'string') {
    return err(decoderInvalidShape('contractorRef-missing-contractId'));
  }
  return ok({
    contractRef: p['contractId'],
    contractorRef: { type: r['type'], id: r['id'] },
    occurredAt: row.occurredAt,
  });
};
