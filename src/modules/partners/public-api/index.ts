// Barrel do public-api do módulo `partners` — único ponto de import externo
// (ADR-0006). Por ora expõe apenas as refs por ID; eventos e read models entram
// nos tickets de agregado.
//
// Para os namespaces de ref, importar diretamente:
//   import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';

export type { SupplierRef, FinancierRef, CollaboratorRef, PartnerRefError } from './refs.ts';
