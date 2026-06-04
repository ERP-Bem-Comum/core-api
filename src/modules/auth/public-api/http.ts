/**
 * Ponto público HTTP do módulo auth (ADR-0006/0028).
 *
 * Único ponto de import externo da borda HTTP do módulo — o composition root
 * (`src/server.ts`) importa daqui:
 *  - `buildAuthHttpDeps(config)`: monta adapters por driver e instancia os use cases;
 *  - `authHttpPlugin(deps)`: factory do plugin Fastify (registra as rotas sob /auth).
 *
 * Separado de um eventual barrel `index.ts` (eventos) de propósito: importar este módulo
 * arrasta Fastify, que não deve alcançar consumidores de evento.
 */

export { authHttpPlugin } from '../adapters/http/plugin.ts';
export { buildAuthHttpDeps } from '../adapters/http/composition.ts';
export { makeRequireAuth, makeAuthorize, makeHasPermission } from '../adapters/http/auth-hook.ts';
export { parseE2eAuthSeed } from '../adapters/http/e2e-seed.ts';
export type {
  AuthHttpDeps,
  AuthCompositionConfig,
  AuthDriver,
  AuthSeed,
} from '../adapters/http/composition.ts';
