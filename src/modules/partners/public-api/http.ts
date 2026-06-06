/**
 * Ponto público HTTP do módulo partners (ADR-0006/0028/0033).
 *
 * Único ponto de import externo da borda HTTP do módulo — o composition root
 * (`src/server.ts`) importa daqui:
 *  - `buildPartnersHttpDeps(config)`: monta adapters por driver (RW split) e instancia os use cases;
 *  - `collaboratorsHttpPlugin(deps, { requireAuth, authorize })`: factory do plugin Fastify
 *    (rotas sob /collaborators, registradas pelo root sob /api/v1 — espelho do legado).
 *
 * Separado do barrel `index.ts` (read port/eventos) de propósito: importar este módulo
 * arrasta Fastify, que não deve alcançar consumidores de read/evento.
 */

export { collaboratorsHttpPlugin } from '../adapters/http/plugin.ts';
export type { CollaboratorsHttpHooks } from '../adapters/http/plugin.ts';
export { suppliersHttpPlugin } from '../adapters/http/supplier-plugin.ts';
export type { SuppliersHttpHooks } from '../adapters/http/supplier-plugin.ts';
export { financiersHttpPlugin } from '../adapters/http/financier-plugin.ts';
export type { FinanciersHttpHooks } from '../adapters/http/financier-plugin.ts';
export { partnerGeographyHttpPlugin } from '../adapters/http/partner-geography-plugin.ts';
export type { PartnerGeographyHttpHooks } from '../adapters/http/partner-geography-plugin.ts';
export { actHttpPlugin } from '../adapters/http/act-plugin.ts';
export type { ActsHttpHooks } from '../adapters/http/act-plugin.ts';
export { buildPartnersHttpDeps } from '../adapters/http/composition.ts';
export type {
  PartnersHttpDeps,
  PartnersCompositionConfig,
  PartnersDriver,
} from '../adapters/http/composition.ts';
export {
  COLLABORATOR_PERMISSION,
  SUPPLIER_PERMISSION,
  FINANCIER_PERMISSION,
  GEOGRAPHY_PERMISSION,
  ACT_PERMISSION,
} from './permissions.ts';
export type {
  CollaboratorPermission,
  SupplierPermission,
  FinancierPermission,
  GeographyPermission,
  ActPermission,
} from './permissions.ts';
