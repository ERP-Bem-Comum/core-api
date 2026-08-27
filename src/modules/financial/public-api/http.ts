/**
 * Ponto público HTTP do módulo financial (ADR-0006).
 *
 * Único ponto de import externo da borda HTTP — `src/server.ts` importa daqui:
 *  - `financialHttpPlugin(deps, hooks)`: factory do plugin Fastify (rotas sob /financial).
 *  - `buildFinancialHttpDeps(config)`: monta adapters por driver e instancia use cases.
 *
 * Separado do barrel `index.ts` (eventos/permissões) de propósito: importar este módulo
 * arrasta Fastify, que não deve alcançar consumidores de evento.
 */

export { financialHttpPlugin } from '../adapters/http/plugin.ts';
export type { FinancialHttpHooks } from '../adapters/http/plugin.ts';
export { buildFinancialHttpDeps } from '../adapters/http/composition.ts';
export type {
  FinancialHttpDeps,
  FinancialCompositionConfig,
  FinancialDriver,
} from '../adapters/http/composition.ts';

// Exercício da VAN — plugin acessório, montado só quando `VAN_SANDBOX_TOKEN` e `VAN_SANDBOX_S3_*`
// estão configurados. Uma factory só, e não as peças soltas: quem chama não deve poder montar a
// rota com um storage de sua escolha, porque a escolha errada é o bucket de pagamento. A remoção é
// trivial de propósito — esta linha, uma no `server.ts` e quatro arquivos.
export { buildVanSandboxPlugin } from '../adapters/http/van-sandbox-composition.ts';
