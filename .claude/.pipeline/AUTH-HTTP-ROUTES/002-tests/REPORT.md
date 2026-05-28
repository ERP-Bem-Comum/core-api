# W0 — Testes RED — AUTH-HTTP-ROUTES (H1a)

**Wave:** W0 · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## Decisão de fatiamento (autorizada pela SPEC §8)

Ao investigar o wiring (composition root com chaves ES256 + memory/mysql + crypto), confirmou-se que o H1
inteiro (4 rotas) incha. **Fatiado:**
- **H1a (este ticket):** composition root **completo** (monta os 4 use cases) + rotas `register` + `login`.
- **H1b (`AUTH-HTTP-ROUTES-SESSION`, a abrir):** rotas `refresh` + `logout` — reusam o composition root (trivial).

CAs cobertos neste W0: **CA1–CA6, CA11, CA12** (+ CA13 regressão). CA7 (login-disabled), CA8–CA10
(refresh/logout) → H1b / teste de integração.

## Escrito

`tests/modules/auth/adapters/http/routes.test.ts` — via `buildAuthHttpDeps({ driver: 'memory' })` +
`authHttpPlugin(deps)` + `buildApp`:

| CA | Asserção |
| :-- | :-- |
| CA1 | register inédito → 201 |
| CA2 | register repetido → 409 `email-already-registered` |
| CA3 | body inválido → 400 `validation` |
| CA4 | senha fraca → 422 |
| CA5 | login válido → 200 `{accessToken, refreshToken, userId}` (3 não-vazios) |
| CA6 | senha errada → 401 `invalid-credentials`; email inexistente → 401 (mesma resposta) |
| CA11 | `/docs/json` contém register+login; `__ping` ausente |
| CA12 | `/api/v2/auth/*` → `cache-control: no-store` |

## RED

```
node --test routes.test.ts
✖ fail  (buildAuthHttpDeps + factory authHttpPlugin inexistentes em public-api/http.ts)
```

## Contrato de design (para o W1)

- `AuthHttpDeps` = use cases instanciados (registerUser, authenticateUser, refreshAccessToken, revokeSession) + `shutdown`. O plugin **só invoca** (não conhece adapters).
- `buildAuthHttpDeps({driver:'memory'|'mysql'})`: memory gera chaves ES256 efêmeras (`generateKeyPair('ES256')`), stores in-memory; mysql wira repos Drizzle + pool (espelha CLI) + chaves de env.
- `authHttpPlugin(deps)` (factory) registra as rotas sob `/auth`; remove `__ping`.
- O `plugin.test.ts` (sentinela) será removido no W1 (plugin deixa de ser sentinela).
