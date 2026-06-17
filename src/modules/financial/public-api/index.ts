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

// Read-model de fornecedor (US2 #47): consumido pelo worker de projeção (composition root),
// que aplica eventos do `partners` no read-model local. Store/driver são exportados no ticket
// do worker (WORKER-SUPPLIER-PROJECTION).
export { applySupplierEvent } from '../application/use-cases/apply-supplier-event.ts';
export type {
  ApplySupplierEventInput,
  ApplySupplierEventError,
} from '../application/use-cases/apply-supplier-event.ts';
export type {
  SupplierViewStore,
  SupplierViewStoreError,
} from '../application/ports/supplier-view-store.ts';
