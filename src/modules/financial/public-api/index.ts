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

// Read-model de payables (Camada 0 do Dashboard/Reports, #235): consumido pelo worker de projeção
// `payable-view-projection` (composition root), que aplica os eventos do `fin_outbox` no read-model.
export { applyPayableEvent } from '../application/use-cases/apply-payable-event.ts';
export type {
  ApplyPayableEventInput,
  ApplyPayableEventError,
} from '../application/use-cases/apply-payable-event.ts';
export type {
  PayableViewStore,
  PayableViewStoreError,
} from '../application/ports/payable-view-store.ts';

// Reader boot-scoped da agregação "Fornecedores sem Contrato" (#240 REP-2 — read-only). Pool
// aberto uma vez (não por requisição). Consumido pelo módulo `reports` via ACL.
export { openSuppliersWithoutContractReader } from './suppliers-without-contract-projection.ts';
export type {
  SupplierWithoutContractRow,
  SuppliersWithoutContractReader,
} from './suppliers-without-contract-projection.ts';

// Reader boot-scoped da "Posição de Pagamentos" (#243 REP-4 — read-only). Agrega fin_payable_view
// por Fornecedor×CentroCusto×Categoria em 3 baldes. Consumido pelo `reports` via ACL.
export { openPaymentPositionReader } from './payment-position-projection.ts';
export type { PaymentPositionRow, PaymentPositionReader } from './payment-position-projection.ts';
