/**
 * Public API do módulo Financial — barrel.
 *
 * Outros módulos (`contracts`, `notifications`, futuros) importam APENAS daqui.
 * Nunca importar de `../domain/`, `../application/` nem `../adapters/`
 * diretamente — isso quebra a fronteira do modular monolith (ADR-0006).
 *
 * Exports atuais:
 *   - `FinancialModuleEvent` — union estável dos eventos do módulo.
 *   - `FINANCIAL_SCHEMA_VERSION` — wire format version (atual: 1).
 *   - `isFinancialModuleEvent` — type guard para borda externa.
 */

export * from './events.ts';
