# AUTH-HTTP-E2E-SMOKE — smoke E2E da borda auth (servidor real + MySQL via Docker + fetch)

## Origem

Pedido do usuário (2026-05-28): provar a borda HTTP de auth **de ponta a ponta**, simulando produção —
servidor Fastify real subido contra **MySQL real (Docker)**, exercitado por um cliente **Node + `fetch`**
(como o front/BFF faria). Valida as 5 rotas e, de quebra, **fecha o gap do branch `mysql`** do composition
auth (os unitários só cobrem `driver: 'memory'`).

## Fluxo a validar (produção-like)

```
GET  /api/v2/auth/me        401   (sem token)
POST /api/v2/auth/register  201
POST /api/v2/auth/login     200   { accessToken, refreshToken, userId }   (JWT ES256 + refresh opaco)
GET  /api/v2/auth/me        200   (Bearer accessToken) → { userId }
POST /api/v2/auth/refresh   200   (refresh rotacionado ≠ anterior)
POST /api/v2/auth/logout    204   (idempotente)
POST /api/v2/auth/refresh   401   (refresh já revogado/rotacionado após logout)
```

## Estado atual (pronto)

- Borda auth completa (H1a/H1b/H2): rotas + composition `buildAuthHttpDeps({driver})` + `src/server.ts`
  (entrypoint; lê `AUTH_DRIVER`/`AUTH_DATABASE_URL`/`PORT`; mysql aplica migrations no boot).
- Infra Docker: `compose.yaml` (serviço `mysql` 8.4, db `core`, porta 3306); padrão `test:integration:auth`
  (gera `secrets/*.txt`, `docker compose up -d mysql --wait`, teardown `down -v`).
- **NÃO existe** script de start do servidor nem suíte E2E.
- Connection string já usada nos testes Drizzle auth: `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core`.

## O que este ticket entrega

1. **`tests/e2e/auth-smoke.e2e.ts`** — smoke via `node:test` + **`fetch` global** contra o server real
   (`E2E_BASE_URL`, default `http://127.0.0.1:3100`); `before()` faz poll de `/health` até o boot.
2. **Script `serve`** no `package.json` — sobe `src/server.ts` (entrypoint; útil em geral).
3. **Script `test:e2e:auth`** — orquestra: gera secrets → `docker compose up -d mysql --wait` → sobe o server
   (`AUTH_DRIVER=mysql`, `AUTH_DATABASE_URL=...`, `PORT=3100`) em background → roda o smoke → teardown
   (mata o server, `docker compose down -v`, remove secrets).

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1–CA7:** o fluxo acima (status + shape) verde contra MySQL real via `fetch`.
- **CA8 (persistência real):** o `register` persiste no MySQL (login subsequente lê e autentica) — prova o branch `mysql`.
- **CA9 (isolado do gate padrão):** o E2E **não** roda em `pnpm test` (exige Docker); só via `pnpm run test:e2e:auth`.

## Fora de escopo

- E2E de contracts/fin (épico-filho). Performance/load. CI wiring (compose.ci) — pode ser follow-up.

## Notas

- Cliente **Node + `fetch`** (Node 24 global) — espelha o front/BFF; nada de `app.inject` aqui (isso é unitário).
- Agentes: `docker-compose-expert` (orquestração) · `nodejs-runtime-expert` (spawn/server) · `fastify-server-expert`.
- Não roda no `pnpm test` (memória `test_integration_auth_gap` — gates Docker são manuais).
