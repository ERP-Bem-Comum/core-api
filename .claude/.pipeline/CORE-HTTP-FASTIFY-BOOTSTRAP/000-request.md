# CORE-HTTP-FASTIFY-BOOTSTRAP (H0) — bootstrap HTTP transversal do core-api

## Origem

Ticket #1 do épico [`EPIC-HTTP-CORE-API`](../../.planning/EPIC-HTTP-CORE-API.md). Funda a borda HTTP
(ADR-0025) com a stack contract-first Zod (ADR-0027). **Transversal** — não pertence a um módulo; vive em
`src/http/`. Não expõe rotas de negócio (auth = H1; contracts = épico-filho).

## Escopo (o mínimo que destrava H1+)

Servidor Fastify v5 montado por um **composition root único**, com:
- Type-provider + validator/serializer compilers do `fastify-zod-openapi` (Zod v4 → validação + OpenAPI 3.1.1).
- Hardening: `@fastify/helmet`, `@fastify/cors`, `@fastify/rate-limit`.
- Logging Pino + `request-id` propagado (reusa o ALS de `src/shared/observability/correlation.ts`).
- **Error handler central** `Result.error`/exceção/ZodError → status HTTP + envelope estável (sem stack ao cliente).
- `GET /health` (sem tocar banco) e `GET /docs` + `/docs/json` (OpenAPI 3.1.1 gerado).
- Graceful shutdown (SIGTERM/SIGINT → `app.close()`), reusando `src/shared/runtime/last-resort.ts`.
- Helper `sendResult(reply, result, map)` que as rotas de H1+ usam para traduzir `Result<T,E>`→HTTP.

## Fora de escopo
- Rotas de negócio (auth H1, contracts épico-filho) — buildApp aceita plugins de rota, mas H0 não registra nenhum.
- TLS (termina no BFF — ADR-0005). RW split (I1). `public-api/http.ts` de auth (#2/H1).

## Critérios de aceitação
Detalhados em [`001-spec/SPEC.md`](./001-spec/SPEC.md) §3 (CA1–CA7). Resumo: servidor sobe; `/health` 200;
error handler 500 sem stack; ZodError → 400; helmet headers; 404 com envelope; `/docs/json` openapi `3.1.1`.

## Recursos
Spec-mãe §11 #1: agentes `fastify-server-expert` (W1) · `nodejs-runtime-expert` · `pnpm-workspace-expert`;
skill `ports-and-adapters`; docs `fastify/{Guides,Reference}`, `fastify-plugins/*`, `nodejs/{Process,HTTP}`, ADR-0025/0027.
