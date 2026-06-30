# W1 — Implementação · AUTH-HTTP-ME

**Agente:** fastify-server-expert · **Outcome:** GREEN

## Mudanças

- `adapters/http/me-plugin.ts` (novo) — `meHttpPlugin` + `MeHttpDeps`. Rotas `GET/PUT /me` +
  `POST /me/password-reset`, só `requireAuth` (self por construção via `req.userId`). Reusa
  `getUser`, `updateUserProfile`, `requestPasswordReset` (sem use case/domínio novo).
- `adapters/http/users-schemas.ts` — `meUpdateBodySchema` (restrito a `name`/`telephone`).
- `public-api/http.ts` — exporta `meHttpPlugin` + `MeHttpDeps`/`MeHttpHooks`.
- `src/server.ts` — registra `meHttpPlugin` sob `/api/v1`.

## Verde

```
me route: tests 6 · pass 6
suite completa: 2399 pass · 0 fail
```

CA1/CA4 (401) · CA2 (GET self) · CA3 (PUT nome/telefone) · CA5 (password-reset 202) · CA6 (self-only).
`POST /me/password-reset` responde sempre 202; email da identidade autenticada, nunca do body.
