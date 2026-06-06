// Barrel do public-api do módulo `partners` — único ponto de import externo
// (ADR-0006). Por ora expõe apenas as refs por ID; eventos e read models entram
// nos tickets de agregado.
//
// Para os namespaces de ref, importar diretamente:
//   import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';

export type { SupplierRef, FinancierRef, CollaboratorRef, PartnerRefError } from './refs.ts';

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
