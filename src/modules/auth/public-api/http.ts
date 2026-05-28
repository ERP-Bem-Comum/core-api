/**
 * Ponto público HTTP do módulo auth (ADR-0006/0028).
 *
 * Único ponto de import externo do plugin de rotas — o composition root (`src/server.ts`)
 * importa daqui, nunca de `../adapters/` ou `../application/` diretamente.
 *
 * Separado de um eventual barrel `index.ts` (contrato de domínio/eventos) de propósito:
 * importar este módulo arrasta Fastify, que não deve alcançar consumidores de eventos.
 */

export { authHttpPlugin } from '../adapters/http/plugin.ts';
