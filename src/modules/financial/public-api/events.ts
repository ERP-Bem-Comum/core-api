/**
 * Public API do módulo Financial — union estável de eventos cross-module.
 *
 * Outros módulos (`contracts`, `notifications`, futuros) importam APENAS daqui
 * (ADR-0006 §"Modular monolith — Public API por módulo"). Nunca importar de
 * `../domain/`, `../application/` nem `../adapters/` diretamente.
 *
 * Schema version: 1
 *   - Adicionar variante NUNCA quebra v1 (consumers fazem switch exaustivo).
 *   - Remover/renomear variante exige bump para v2 + decoder v2 mantido lado a lado
 *     (decoder vem com FIN-ADAPTER-OUTBOX-DRIZZLE, que traz `OutboxRow` + schema MySQL).
 *
 * Atualmente o módulo Financial expõe apenas o agregado `Payable` (9 variants do
 * `PayableEvent`). Quando `FiscalDocument` ou outro agregado for adicionado,
 * basta estender o type union e atualizar `KNOWN_EVENT_TYPES`.
 */

import type { PayableEvent } from '../domain/payable/events.ts';

// ─── Schema version ───────────────────────────────────────────────────────────

/** Schema version corrente do wire format da outbox. Bump em breaking changes. */
export const FINANCIAL_SCHEMA_VERSION = 1 as const;

// ─── Event union estável ──────────────────────────────────────────────────────

/** Union estável de todos os eventos públicos do módulo Financial. */
export type FinancialModuleEvent = PayableEvent;

// ─── Known event types ────────────────────────────────────────────────────────

const KNOWN_EVENT_TYPES: ReadonlySet<string> = new Set([
  'PayableOpened',
  'PayableApproved',
  'PayableTransmitted',
  'PayableRejected',
  'PayableMarkedOverdue',
  'PayableResetToApproved',
  'PayablePaidManually',
  'PayableBankOutflowConfirmed',
  'PayableSettled',
]);

// ─── Type guard ───────────────────────────────────────────────────────────────

/**
 * Type guard para borda externa (e.g., webhook listener, HTTP handler).
 *
 * Rejeita: null, primitivos, objetos sem campo `type`, `type` não-string
 * e tipos não reconhecidos no contrato v1.
 */
export const isFinancialModuleEvent = (u: unknown): u is FinancialModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const candidate = u as { type?: unknown };
  if (typeof candidate.type !== 'string') return false;
  return KNOWN_EVENT_TYPES.has(candidate.type);
};
