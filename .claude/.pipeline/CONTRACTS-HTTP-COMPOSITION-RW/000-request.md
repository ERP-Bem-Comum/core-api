# CONTRACTS-HTTP-COMPOSITION-RW (C0) — composition dual-pool + plugin + 1ª rota (list)

## Origem

[`EPIC-CONTRACTS-HTTP`](../../.planning/EPIC-CONTRACTS-HTTP.md) §10 C0 (spec-mãe aprovada 2026-05-28).
Primeira fatia da borda HTTP de contracts: estabelece o **composition root com RW split** (ADR-0026, retoma
o I1 no lugar onde rende), o **plugin factory** protegido (requireAuth do auth) e a **1ª rota read**
(`GET /api/v2/contracts`). Espelha o padrão do `auth` (composition + plugin factory) + dual-pool.

## Estado atual (pronto — só consumir)

- **auth HTTP completo:** `auth/public-api/http.ts` exporta `makeRequireAuth(verifyAccessToken)` + `makeAuthorize(userReader)` + `buildAuthHttpDeps`. Padrão de composition + plugin factory + `buildApp({ routes })`.
- **contracts:** `listContracts({ contractRepo })` (read); `ContractRepository` (findById/list/save juntos); `createDrizzleContractRepository(handle)`; driver `openMysql(connectionString)` → `MysqlHandle {db,schema,close}`; CLI `buildContext` (memory/mysql) monta contractRepo/amendmentRepo/documentRepo/outbox/clock.
- **shell:** `src/shared/http/` (`buildApp`, `sendResult`), baseline de segurança, `src/server.ts`.

## O que este ticket entrega

1. `contracts/adapters/http/composition.ts` — `buildContractsHttpDeps({ driver, writerUrl?, readerUrl? })`:
   - **dual-pool:** `writerHandle = openMysql(writerUrl)`; `readerHandle = readerUrl ? openMysql(readerUrl) : writerHandle` (single-node reusa).
   - instancia o repo **2×** (`createDrizzleContractRepository(readerHandle|writerHandle)`); injeta por intenção.
   - `ContractsHttpDeps` = use cases instanciados (`listContracts` no **reader**; mutações virão no C2 no **writer**) + `shutdown` (fecha os pools distintos).
   - driver `memory`: reader = writer = mesmo store in-memory (sem split físico).
2. `contracts/adapters/http/{plugin,schemas}.ts` — `contractsHttpPlugin(deps, { requireAuth })`: sub-escopo `/contracts`; `GET /` (list) com `preHandler: requireAuth` + schema Zod de resposta.
3. `contracts/public-api/http.ts` — exporta `contractsHttpPlugin` + `buildContractsHttpDeps` + tipos.
4. `src/server.ts` — compõe `authDeps` + `contractsDeps`; `requireAuth = makeRequireAuth(authDeps.verifyAccessToken)`; `buildApp({ routes: [authHttpPlugin(authDeps), contractsHttpPlugin(contractsDeps, { requireAuth })] })`; shutdown de ambos.

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1:** `GET /api/v2/contracts` sem `Authorization` → **401** (requireAuth).
- **CA2:** com `Bearer <accessToken válido>` → **200** com array de contratos (lista; vazia OK).
- **CA3:** `GET /docs/json` contém `/api/v2/contracts`.
- **CA4 (RW split estrutural):** `listContracts` é wirado ao **contractReaderRepo**; `buildContractsHttpDeps` aceita `readerUrl` distinto (handles separados) — em memory, reader=writer.
- **CA5 (regressão):** rotas auth (register/login/refresh/logout/me) seguem verdes; shell/baseline verdes.

## Fora de escopo (vai para C1+)

- `GET /{id}`, `/{id}/history` → C1. Mutações (create/activate/amendment) → C2. Documentos → C3. CSV → C4. E2E → C5.
- `authorize(permission)` nas rotas (RBAC fino) — C0 só exige `requireAuth` (autenticado); permissão por rota entra com as mutações (C2).

## Notas

- Agentes: `mysql2-driver-expert` (dual pool) · `drizzle-orm-expert` (repo 2×) · `fastify-server-expert` (plugin+preHandler). Skill: `ports-and-adapters`.
- Cross-módulo: contracts consome `auth/public-api/http.ts` (requireAuth) — permitido (ADR-0006). Pipeline W0→W3.
