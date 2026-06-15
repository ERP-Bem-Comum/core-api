/**
 * Barrel da public-api do módulo financial (ADR-0006).
 *
 * Único ponto de import de eventos e permissões para outros módulos.
 * NÃO re-exporta borda HTTP (ver http.ts — importar http.ts arrasta Fastify).
 */

export { FINANCIAL_SCHEMA_VERSION, isFinancialModuleEvent } from './events.ts';
export type { FinancialModuleEvent } from './events.ts';

export { FINANCIAL_PERMISSION } from './permissions.ts';
export type { FinancialPermission } from './permissions.ts';
