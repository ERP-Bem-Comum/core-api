# AUTH-HTTP-ROUTES-SESSION (H1b) — rotas refresh + logout

## Origem

[`EPIC-HTTP-CORE-API`](../../.planning/EPIC-HTTP-CORE-API.md) §10 #3b. Continuação de `AUTH-HTTP-ROUTES`
(H1a, closed-green), que fatiou as 4 rotas (SPEC §8). H1a já entregou o **composition root completo** —
`buildAuthHttpDeps` instancia os 4 use cases, incluindo `refreshAccessToken` e `revokeSession`. Este
ticket só pendura as 2 rotas restantes no plugin + schemas. Reusa as decisões D1–D5 aprovadas no H1.

## Estado atual (pronto)

- `AuthHttpDeps` já expõe `refreshAccessToken` e `revokeSession` (composition.ts).
- `authHttpPlugin(deps)` (factory) registra register/login sob `/auth`; `sendResult` + schemas Zod prontos.
- Use cases: `refreshAccessToken({refreshToken}) → {accessToken, refreshToken, userId}`; `revokeSession({refreshToken}) → void` (idempotente, DD-SESSION-06).

## O que este ticket entrega

1. `POST /api/v2/auth/refresh` → `refreshAccessToken` → **200** `{accessToken, refreshToken, userId}` (rotação).
2. `POST /api/v2/auth/logout` → `revokeSession` → **204** (idempotente).
3. 2 schemas Zod (`refreshBody`/`logoutBody`; response do refresh reusa o shape de login).

## Critérios de aceitação (detalhados na 001-spec/SPEC.md)

- **CA8 refresh-happy:** login → usa o refresh retornado → `/refresh` → 200 com novos tokens.
- **CA9 refresh-bad:** refresh inexistente/inválido → 401.
- **CA10 logout:** refresh válido → 204; chamada repetida → 204 (idempotente).
- **CA11 openapi:** `/docs/json` passa a conter `/api/v2/auth/{refresh,logout}` (além de register/login).
- **CA-regressão:** `routes.test.ts` (register/login) + shell/baseline verdes.

## Fora de escopo

- AuthZ preHandler → **H2**; RW split → **I1**; change-password/assign-role → posterior.
- Reuse-detection avançada (refresh rotacionado revoga cadeia — DD-SESSION-05) já é do domínio/use case; aqui só expõe o 401.

## Notas

- **Erro→HTTP (refresh):** `refresh-token-{not-found,revoked,rotated,expired}`→401; `user-disabled`→403; resto→500.
- **logout:** `revoke-session` sucesso→204 (sem body); `refresh-token-repo-unavailable`→500.
- Agente: `fastify-server-expert`. Pipeline W0→W3. SPEC reusa D1–D5 do H1.
