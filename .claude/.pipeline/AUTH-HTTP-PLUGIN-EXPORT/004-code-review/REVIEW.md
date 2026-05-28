# Code Review — AUTH-HTTP-PLUGIN-EXPORT — Round 1

**Veredito:** APPROVED

**Reviewer:** code-reviewer
**Data:** 2026-05-28
**Escopo revisado:** `src/modules/auth/adapters/http/plugin.ts`, `src/modules/auth/public-api/http.ts`,
`src/server.ts` (wiring), `tests/modules/auth/adapters/http/plugin.test.ts`

---

## Verificação por categoria

| Cat. | Item | Resultado |
| :-- | :-- | :-- |
| E (Modular Monolith / ADR-0006) | `src/server.ts:16` importa o plugin **só** de `#src/modules/auth/public-api/http.ts` (não de `adapters/`); `public-api/http.ts` re-exporta de `adapters/http/plugin.ts` | ✅ CA5 |
| E | `plugin.ts` importa **apenas** `fastify`, `fastify-zod-openapi`, `zod/v4` — **sem** `domain/`/`application/` (sentinela não toca use case) | ✅ |
| D/Borda (ADR-0025:29) | HTTP é adapter em `adapters/http/`; nenhum Fastify/Zod em `auth/domain` ou `auth/application` | ✅ |
| ADR-0027 | Zod só na borda; response schema (`z.literal(true)`) gera o path no `/docs/json` | ✅ CA3 |
| ADR-0025:35 | rota sob `/api/v2/auth/*` (root aplica `/api/v2`, plugin aplica `/auth`) | ✅ |
| F (ESM/NodeNext) | imports com `.ts` quando relativos; `import type` nos type-only; `import * as z` | ✅ |
| Regras absolutas | sem `throw`/`class`/`this`/`any`; `true as const` (não cast inseguro) | ✅ |
| H (Tests) | 5 CAs via `app.inject` (black-box), incluindo o caso negativo (sem plugin → 404) e o estrutural (CA5) | ✅ |

## Decisão de tipos (boa)

`authHttpPlugin: FastifyPluginAsync` (provider default) casa com `BuildAppOptions.routes`; o provider Zod é
aplicado **dentro** via `withTypeProvider` antes de registrar `authRoutes` (`FastifyPluginAsyncZodOpenApi`).
Evita fricção de tipo **sem** alterar o shell (`src/shared/http/app.ts`) — escopo respeitado.

## O que está bom

- Sentinela `__ping` claramente temporária (documentada; H1 remove) — não polui a superfície de produção.
- `public-api/http.ts` isolado do barrel de eventos (ADR-0028) — Fastify não vaza a consumidores de evento.
- Encapsulamento real (sub-escopo com `prefix: '/auth'`), não path concatenado — pronto para os hooks de authn do H2.

## Issues

Nenhuma 🔴 / 🟡 / 🔵.

## Próximo passo

APPROVED → W3 (gate já verde: typecheck/lint/format/test).
