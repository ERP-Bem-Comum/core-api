# AUTH-HTTP-ROUTES (H1) — rotas HTTP reais do módulo auth

## Origem

[`EPIC-HTTP-CORE-API`](../../.planning/EPIC-HTTP-CORE-API.md) §10 #3. Substitui a sentinela `__ping`
(AUTH-HTTP-PLUGIN-EXPORT) pelas 4 rotas reais, wirando os use cases já prontos aos adapters concretos via
um composition root HTTP. Aplica ADR-0024 (auth via HTTP), ADR-0025 (HTTP é adapter), ADR-0027 (Zod borda),
ADR-0006/0028 (módulo expõe via public-api; root transversal compõe).

## Estado atual (pronto — só consumir)

- **Use cases (factory `(deps) => (cmd) => Promise<Result>`):**
  - `registerUser` — cmd `{email,password}` → `{user, event}`; deps `{userReader, userRepo, passwordHasher, clock}`; erros: `email-already-registered`, policy, `PasswordHasherError`, `UserRepositoryError`.
  - `authenticateUser` (login) — `{email,password}` → `{accessToken, refreshToken, userId}`; deps `{userReader, passwordHasher, tokenIssuer, refreshTokenMinter, refreshTokenRepo, clock, refreshTtlSeconds}`; erros: `invalid-credentials`(401), `user-disabled`(403), `session-issue-failed`.
  - `refreshAccessToken` — `{refreshToken}` → `{accessToken, refreshToken, userId}`; deps `{userReader, tokenIssuer, refreshTokenMinter, refreshTokenRepo, clock, refreshTtlSeconds}`; reuse-detection (DD-SESSION-05).
  - `revokeSession` (logout) — `{refreshToken}` → `Result<void, RefreshTokenRepositoryError>`; deps `{refreshTokenMinter, refreshTokenRepo, clock}`; idempotente (DD-SESSION-06).
- **Adapters:** repos in-memory + drizzle (user/role/refresh-token); `password-hasher.argon2`; `token-issuer.es256` (chaves injetadas — DD-TOKEN-01); `refresh-token-minter.node`; clock real/fixed.
- **Borda:** `authHttpPlugin` (sentinela) + `buildApp({ routes })` por injeção; shell hardenizado (CORE-HTTP-SECURITY-BASELINE).
- **Padrão de composition:** `contracts/cli/{context,drivers/{memory,mysql}}.ts` — `buildContext(driver)` switch memory/mysql.

## O que este ticket entrega

1. **4 rotas** sob `/api/v2/auth/` (substituem `__ping`), cada handler: `parse (Zod) → smart constructor implícito no use case → use case → sendResult(Result→HTTP)`:
   - `POST /register` → `registerUser` → **201**.
   - `POST /login` → `authenticateUser` → **200** `{accessToken, refreshToken, userId}`.
   - `POST /refresh` → `refreshAccessToken` → **200** `{accessToken, refreshToken, userId}`.
   - `POST /logout` → `revokeSession` → **204** (idempotente).
2. **Composition root auth** (memory/mysql) espelhando a CLI — monta as deps e injeta nos handlers.
3. **Injeção de deps no plugin:** `authHttpPlugin` vira factory `(deps) => FastifyPluginAsync`; `src/server.ts` compõe e passa; `public-api/http.ts` exporta factory + builder.
4. **Schemas Zod** por rota (request/response) → OpenAPI (ADR-0027); mapeamento erro→HTTP central via `sendResult`.

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- CA-register: email novo → 201; email repetido → 409; body inválido → 400; senha fraca → 422.
- CA-login: credencial válida → 200 + tokens; inválida → 401; user disabled → 403.
- CA-refresh: refresh válido → 200 + novos tokens; inválido/expirado → 401.
- CA-logout: refresh válido → 204; repetido → 204 (idempotente).
- CA-openapi: as 4 rotas aparecem em `/docs/json`.
- CA-regressão: shell (`bootstrap`) e baseline verdes; `__ping` removida.

## Fora de escopo

- **AuthZ preHandler** (verify access token + `authorize`) → **H2 `AUTH-HTTP-AUTHZ-HOOK`**.
- **RW split real** (writer/reader pools) → **I1 `CORE-DB-RW-SPLIT-POOLS`** (por ora reader=writer single-node).
- Rotas `change-password`/`assign-role` (protegidas) → fase posterior.
- Cookie de sessão / gestão de refresh no browser → responsabilidade do BFF (ADR-0005).

## Notas

- **Agente W1:** `fastify-server-expert` (rotas/schema) + `security-backend-expert` (revisão de borda: 401/403, rate-limit auth, sem secret em log). **Skills:** `ports-and-adapters`. Pipeline W0→W3, SPEC formal (segurança + nova superfície).
- DD relevantes: DD-LOGIN-01/02 (refresh opaco), DD-TOKEN-01 (ES256), DD-SESSION-04/05/06.
