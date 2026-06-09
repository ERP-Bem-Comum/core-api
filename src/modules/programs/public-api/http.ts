/**
 * Ponto público HTTP do módulo programs (ADR-0006/0028/0033).
 *
 * Único ponto de import externo da borda HTTP do módulo — o composition root
 * (`src/server.ts`) importa daqui:
 *  - `buildProgramsHttpDeps(config)`: monta adapters por driver e instancia os use cases;
 *  - `programsHttpPlugin(deps, { requireAuth, authorize })`: factory do plugin Fastify
 *    (rotas sob /programs, registradas pelo root sob /api/v1 — espelho do legado).
 *
 * Separado do barrel `events.ts` de propósito: importar este módulo arrasta Fastify, que
 * não deve alcançar consumidores de evento.
 */

export { programsHttpPlugin } from '../adapters/http/plugin.ts';
export type { ProgramsHttpHooks } from '../adapters/http/plugin.ts';
export { buildProgramsHttpDeps } from '../adapters/http/composition.ts';
export type {
  ProgramsHttpDeps,
  ProgramsCompositionConfig,
  ProgramsDriver,
} from '../adapters/http/composition.ts';
export { PROGRAM_PERMISSION } from './permissions.ts';
export type { ProgramPermission } from './permissions.ts';
