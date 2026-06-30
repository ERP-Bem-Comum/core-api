// Barrel do public-api do módulo `partners` — único ponto de import externo
// (ADR-0006). Por ora expõe apenas as refs por ID; eventos e read models entram
// nos tickets de agregado.
//
// Para os namespaces de ref, importar diretamente:
//   import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';

export type { SupplierRef, FinancierRef, CollaboratorRef, PartnerRefError } from './refs.ts';

// VOs de destino de pagamento expostos na fronteira pública (consumidos pelo `contracts` na
// composição do contratado). Import cross-módulo deve passar pela public-api, nunca por
// `domain/` (ADR-0006 — resolve #101).
export type { BankAccount, PixKey } from '../domain/shared/payment-target.ts';

// Read port do contratado (PARTNERS-CONTRACTOR-READ-PORT) — leitura cross-módulo
// da projeção plana do contratado (ADR-0032; ADR-0006/ADR-0014).
export { buildPartnersReadPort } from './read.ts';
export type {
  PartnersReadPort,
  BuildPartnersReadPortOptions,
  BuildPartnersReadPortError,
  ContractorReadPort,
  ContractorReadError,
  SupplierView,
  FinancierView,
  CollaboratorView,
  ActView,
  ContractorView,
} from './read.ts';

// Listagem de fornecedores para projeção/backfill cross-módulo (US2 #47 — read-only).
export { listSuppliersForProjection } from './supplier-projection.ts';
export type { SupplierProjectionRecord } from './supplier-projection.ts';

// US6b: projeção da contagem de contratos por contraparte (consome ctr_outbox via contracts/public-api).
export { applyContractCountEvent } from '../application/use-cases/apply-contract-count-event.ts';
export type {
  ContractCountMessage,
  ApplyContractCountEventError,
} from '../application/use-cases/apply-contract-count-event.ts';
export type {
  ContractCountStore,
  ContractCountStoreError,
} from '../application/ports/contract-count-store.ts';
