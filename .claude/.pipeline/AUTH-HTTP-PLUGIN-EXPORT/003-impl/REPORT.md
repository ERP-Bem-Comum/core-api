# W1 — Implementação (GREEN) — AUTH-HTTP-PLUGIN-EXPORT

**Wave:** W1 · **Agente:** fastify-server-expert (padrão) · **Outcome:** GREEN · **Data:** 2026-05-28

## Arquivos criados/tocados

| Arquivo | Conteúdo |
| :-- | :-- |
| `src/modules/auth/adapters/http/plugin.ts` (novo) | `authHttpPlugin: FastifyPluginAsync` — registra `authRoutes` (sub-escopo Zod-typed) com `prefix: '/auth'` via `withTypeProvider<FastifyZodOpenApiTypeProvider>()`. Rota sentinela `GET /__ping` → `{ pong: true }` com response schema Zod (`z.literal(true)`). |
| `src/modules/auth/public-api/http.ts` (novo) | re-export de `authHttpPlugin` — ponto público único (ADR-0006), separado de barrel de eventos. |
| `src/server.ts` (tocado) | import de `#src/modules/auth/public-api/http.ts`; `buildApp({ routes: [authHttpPlugin], config })`. |

## Decisões de implementação

- **Tipo do export:** `authHttpPlugin: FastifyPluginAsync` (provider default) para casar com
  `BuildAppOptions.routes: readonly FastifyPluginAsync[]`. O type-provider Zod é aplicado **dentro** via
  `app.withTypeProvider<FastifyZodOpenApiTypeProvider>()` antes de registrar `authRoutes`
  (`FastifyPluginAsyncZodOpenApi`). Evita fricção de tipo no wiring sem tocar o shell (`app.ts`).
- **Encapsulamento (SPEC §5 Q3):** `authRoutes` registrado com `prefix: '/auth'`; o root aplica `/api/v2`
  → `/api/v2/auth/__ping`. Escopo Fastify isolado (não vaza hooks/decorators para a raiz).
- **Contract-first (ADR-0027):** `schema: { response: { 200: pingResponse } } satisfies FastifyZodOpenApiSchema`
  — o path entra no `/docs/json` gerado (CA3).

## Evidência GREEN

```
node --test tests/modules/auth/adapters/http/plugin.test.ts
ℹ tests 5 · ℹ pass 5 · ℹ fail 0   (CA1-CA5)
```
typecheck (tsc --noEmit), lint (eslint .), format:check → todos limpos.
