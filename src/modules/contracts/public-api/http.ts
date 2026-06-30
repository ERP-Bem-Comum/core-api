/**
 * Ponto público HTTP do módulo contracts (ADR-0006/0028).
 *
 * Único ponto de import externo da borda HTTP do módulo — o composition root
 * (`src/server.ts`) importa daqui:
 *  - `buildContractsHttpDeps(config)`: monta adapters por driver (RW split) e instancia os use cases;
 *  - `contractsHttpPlugin(deps, { requireAuth })`: factory do plugin Fastify (rotas sob /contracts).
 *
 * Separado do barrel `index.ts` (eventos) de propósito: importar este módulo arrasta
 * Fastify, que não deve alcançar consumidores de evento.
 */

export { contractsHttpPlugin } from '../adapters/http/plugin.ts';
export type { ContractsHttpHooks } from '../adapters/http/plugin.ts';
export { buildContractsHttpDeps } from '../adapters/http/composition.ts';
export type {
  ContractsHttpDeps,
  ContractsCompositionConfig,
  ContractsDriver,
} from '../adapters/http/composition.ts';
