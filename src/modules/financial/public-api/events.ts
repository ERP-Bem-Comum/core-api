/**
 * PUBLIC API do módulo Financial — eventos publicados via outbox.
 *
 * ADR-0006 §"Modular monolith — Public API por módulo": outros módulos consumem
 * eventos APENAS deste arquivo. Nunca importar de domain/ ou application/ diretamente.
 *
 * Espelha o padrão de contracts/public-api/events.ts.
 * Schema version: 1
 */

import type { DocumentEvent } from '../domain/document/events.ts';
import type { BankStatementImported } from '../domain/statement/events.ts';

/** Schema version corrente do wire format da outbox financeira. Bump em breaking changes. */
export const FINANCIAL_SCHEMA_VERSION = 1 as const;

/** Union estável de todos os eventos públicos do módulo Financial (Fatia 1 + US1 conciliação). */
export type FinancialModuleEvent = DocumentEvent | BankStatementImported;

const KNOWN_FINANCIAL_EVENT_TYPES: ReadonlySet<string> = new Set([
  'DocumentSaved',
  'PayableApproved',
  'ApprovalUndone',
  'DocumentDraftSaved',
  'DocumentCancelled',
  'BankStatementImported',
]);

/**
 * Type guard para borda externa.
 * Rejeita null, primitivos, objetos sem campo `type`, `type` não-string e tipos não
 * reconhecidos no contrato v1.
 */
export const isFinancialModuleEvent = (u: unknown): u is FinancialModuleEvent => {
  if (typeof u !== 'object' || u === null) return false;
  const candidate = u as { type?: unknown };
  if (typeof candidate.type !== 'string') return false;
  return KNOWN_FINANCIAL_EVENT_TYPES.has(candidate.type);
};
