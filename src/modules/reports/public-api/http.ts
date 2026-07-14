/**
 * Ponto público HTTP do módulo reports (ADR-0006/0028/0033).
 *
 * Único ponto de import externo da borda HTTP do módulo — o composition root
 * (`src/server.ts`) importa daqui:
 *  - `buildReportsHttpDeps(config)`: monta o read port por driver (memory|mysql);
 *  - `reportsHttpPlugin(deps, { requireAuth, authorize })`: factory do plugin Fastify
 *    (rotas sob /reports, registradas pelo root DIRETO sob /api/v2 — greenfield).
 *
 * Separado do barrel `application/ports/team-report-read.ts` de propósito: importar este
 * módulo arrasta Fastify, que não deve alcançar consumidores fora da borda HTTP.
 */

export { reportsHttpPlugin } from '../adapters/http/plugin.ts';
export type { ReportsHttpHooks } from '../adapters/http/plugin.ts';
export { buildReportsHttpDeps } from '../adapters/http/composition.ts';
export type {
  ReportsHttpDeps,
  ReportsCompositionConfig,
  ReportsDriver,
} from '../adapters/http/composition.ts';
