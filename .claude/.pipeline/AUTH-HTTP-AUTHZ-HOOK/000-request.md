# AUTH-HTTP-AUTHZ-HOOK (H2) — preHandler de autenticação + rota protegida de prova

## Origem

[`EPIC-HTTP-CORE-API`](../../.planning/EPIC-HTTP-CORE-API.md) §10 #4. As 4 rotas auth (H1a/H1b) são
públicas. Falta o **mecanismo de proteger rotas**: um preHandler que verifica o access JWT (defense-in-depth
sobre o BFF — ADR-0005) e disponibiliza a identidade ao handler, com `authorize(permission)` para RBAC.

## Estado atual (pronto)

- `tokenIssuer.verifyAccessToken(token) → Result<{userId}, TokenIssuerError>` (ES256, valida iss/alg/exp).
- `authorize(user: ActiveUser, required: Permission) → Result<void, 'forbidden'>` (DD-USER-02, fail-closed).
- `userReader.findById(userId)` → `User | null`. Composition (H1a) tem tokenIssuer + userReader internamente.
- `AuthHttpDeps` expõe os 4 use cases + shutdown.

## O que este ticket entrega

1. **preHandler `requireAuth`** (factory recebe `verifyAccessToken`): extrai `Authorization: Bearer <jwt>`,
   verifica → **401** se ausente/inválido/expirado; **decora `request` com o `userId`** autenticado.
2. **Rota protegida de prova `GET /api/v2/auth/me`** → 200 `{ userId }` do token (real, não sentinela).
3. **`authorize` exposto** ao módulo (helper/preHandler factory) para rotas futuras protegidas por permissão
   (carrega `ActiveUser` via `userReader` → `authorize(user, permission)` → **403**).

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA1 me-happy:** login → usa o `accessToken` em `Authorization: Bearer` → `GET /me` → 200 `{userId}`.
- **CA2 me-no-token:** `GET /me` sem header → 401.
- **CA3 me-bad-token:** token inválido/garbage → 401.
- **CA4 (authz unit):** `authorize` mapeia `forbidden` → 403 (helper testável).
- **CA5 openapi:** `/docs/json` contém `/api/v2/auth/me`.
- **CA-regressão:** as 4 rotas (register/login/refresh/logout) seguem verdes.

## Fora de escopo

- Rotas protegidas por permissão específica (change-password/assign-role HTTP) → fase posterior (usam o `authorize` exposto aqui).
- RW split → I1.

## Notas

- **Decisão a avalizar (SPEC §5):** (D1) escopo authn + `/me` + `authorize` exposto vs authn+authz completo com rota sentinela de permissão; (D2) middleware vive no módulo auth, exposto via `public-api/http.ts` (ADR-0006/0024); (D3) `Bearer` token.
- Agente: `fastify-server-expert` + `security-backend-expert` (401/403, sem vazar motivo). Pipeline W0→W3.
