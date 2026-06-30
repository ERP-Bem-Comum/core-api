# W1 — Implementação (GREEN) — AUTH-HTTP-ROUTES-SESSION (H1b)

**Wave:** W1 · **Agente:** fastify-server-expert · **Outcome:** GREEN · **Data:** 2026-05-28

## Mudanças (só 2 arquivos — reusa composition do H1a)

- `auth/adapters/http/schemas.ts` (+): `refreshBodySchema`, `refreshResponseSchema` (= login), `logoutBodySchema`.
- `auth/adapters/http/plugin.ts` (+2 rotas em `authRoutes`):
  - `POST /refresh` → `deps.refreshAccessToken({refreshToken})` → 200; erros `refresh-token-{not-found,revoked,rotated,expired}`→401, `user-disabled`→403.
  - `POST /logout` → `deps.revokeSession({refreshToken})` → 204 (sem body; idempotente).

`composition.ts`/`server.ts`/`public-api/http.ts` **intactos** (use cases já instanciados no H1a).

## Evidência GREEN
```
node --test session.test.ts routes.test.ts → 14 pass / 0 fail (CA8-CA12 + regressão register/login)
typecheck / lint / format → limpos
pnpm test → 1421 pass / 0 fail / 16 skip (zero regressão)
```

As 4 rotas auth completas: register(201) · login(200) · refresh(200, rotação) · logout(204, idempotente).
