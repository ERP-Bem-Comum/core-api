# AUTH-HTTP-PLUGIN-EXPORT — expor o plugin Fastify do módulo `auth` via `public-api/http.ts`

## Origem

[`EPIC-HTTP-CORE-API`](../../.planning/EPIC-HTTP-CORE-API.md) §10 #2 (ticket condicional ao H0).
Fecha o gap técnico apontado na spec-mãe §5/§8 e na 001-spec do H0: **o composition root
(`src/server.ts`) precisa registrar as rotas de cada módulo, mas não pode importar de
`<modulo>/domain/` nem `<modulo>/application/` (ADR-0006)**. O H0 (`CORE-HTTP-FASTIFY-BOOTSTRAP`,
closed-green) já entregou `buildApp({ routes })` recebendo plugins por injeção; falta o módulo
`auth` ter um ponto público que exporte seu plugin HTTP.

## Estado atual (o que já existe — NÃO reimplementar)

- **Bootstrap (H0 + ADR-0028):** `buildApp(opts)` em `src/shared/http/app.ts` registra `opts.routes` sob
  `/api/v2`. `src/server.ts` hoje chama `buildApp({ routes: [], config })` com comentário apontando que a
  composição virá via `<modulo>/public-api/http.ts`.
- **auth:** 6 use cases prontos (`register-user`, `authenticate-user`, `refresh-access-token`,
  `revoke-session`, `change-password`, `assign-role`). **NÃO tem `public-api/`** nem `adapters/http/`.
- **contracts (referência de padrão):** `src/modules/contracts/public-api/index.ts` é o barrel de
  contrato público; `.claude/rules/contracts-module.md` documenta a estrutura de camadas.

## O que este ticket entrega

1. `src/modules/auth/adapters/http/plugin.ts` — `authHttpPlugin: FastifyPluginAsync` que **encapsula**
   o sub-prefixo `/auth` e registra **uma rota sentinela** `GET /__ping` (→ `/api/v2/auth/__ping`),
   com **response schema Zod** (ADR-0027) — serve de template vivo para as 4 rotas reais do H1, que a
   substituirão. Nenhum use case é fiado aqui (rotas reais = H1).
2. `src/modules/auth/public-api/http.ts` — re-exporta `authHttpPlugin`. **Único** ponto de import
   externo do plugin (ADR-0006). Separado do barrel `index.ts` (eventos) para não arrastar Fastify
   a consumidores de eventos do módulo.
3. `src/server.ts` — passa a importar `authHttpPlugin` de `#src/modules/auth/public-api/http.ts`
   e a injetar em `buildApp({ routes: [authHttpPlugin], config })`.

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1 (wiring):** `buildApp({ routes: [authHttpPlugin] })` sobe; `GET /api/v2/auth/__ping` → **200** `{ pong: true }`.
- **CA2 (é o plugin que monta):** sem o plugin (`routes: []`), `GET /api/v2/auth/__ping` → **404** com envelope estável.
- **CA3 (contract-first):** `GET /docs/json` com o plugin registrado contém o path `/api/v2/auth/__ping`.
- **CA4 (encapsulamento):** registrar o plugin não vaza a rota para a raiz (`GET /__ping` → 404) e `/health` segue 200.
- **CA5 (ADR-0006):** `authHttpPlugin` é importável de `#src/modules/auth/public-api/http.ts` e é um `FastifyPluginAsync`.

## Fora de escopo

- Rotas reais de auth (`register/login/refresh/logout`) → **H1 `AUTH-HTTP-ROUTES`**.
- Wiring de use cases, repos Drizzle, JWT issuer, hasher → H1.
- preHandler de authn/authz → **H2 `AUTH-HTTP-AUTHZ-HOOK`**.
- Dual pool writer/reader → **I1 `CORE-DB-RW-SPLIT-POOLS`**.
- Re-exportar o plugin no barrel `public-api/index.ts` (mantém `http.ts` isolado de propósito).

## Notas

- **Agente W1:** `fastify-server-expert` (formato do plugin, encapsulamento) com apoio de
  `typescript-language-expert` (`public-api`/subpath imports). **Skill:** `modular-monolith` (canônica —
  fronteira cross-módulo).
- A rota `__ping` é **sentinela temporária** (dois underscores, padrão dos testes do H0: `/__boom`,
  `/__zod`); o H1 a remove ao introduzir as rotas reais. Não é endpoint de produção.
- Idioma: código EN; doc PT-BR; Zod só em `adapters/http/` (ADR-0027).
