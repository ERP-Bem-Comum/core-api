# W1 — Implementação (GREEN) — AUTH-HTTP-AUTHZ-HOOK (H2)

**Wave:** W1 · **Agente:** fastify-server-expert + security-backend-expert · **Outcome:** GREEN · **Data:** 2026-05-28

## Arquivos

| Arquivo | Conteúdo |
| :-- | :-- |
| `auth/adapters/http/auth-hook.ts` (novo) | `makeRequireAuth(verifyAccessToken)`: `preHandlerAsyncHookHandler` — valida `Bearer`, 401 uniforme, decora `req.userId`. `makeAuthorize(userReader)(permission)`: carrega ActiveUser → `authorize` (RBAC) → 403. Module augmentation `FastifyRequest.userId`. |
| `auth/adapters/http/composition.ts` (+) | `AuthHttpDeps += verifyAccessToken` (do tokenIssuer). |
| `auth/adapters/http/plugin.ts` (+) | `decorateRequest('userId','')` + `requireAuth = makeRequireAuth(deps.verifyAccessToken)` + `GET /me { preHandler: requireAuth }` → `{userId}`. |
| `auth/adapters/http/schemas.ts` (+) | `meResponseSchema`. |
| `auth/public-api/http.ts` (+) | exporta `makeRequireAuth`, `makeAuthorize`. |

## Decisões

- preHandler tipado `preHandlerAsyncHookHandler` (async) — resolve `strict-void-return`; envia reply retornando-a.
- `requireAuth` faz **defense-in-depth** (core re-valida o JWT além do BFF — ADR-0005).
- `makeAuthorize` exposto e implementado (carrega user + `authorize`), **sem rota por-permissão ainda** (D1) — usado a partir das rotas protegidas futuras (change-password/assign-role HTTP).

## Evidência GREEN
```
node --test authz-hook.test.ts → 5 pass (CA1-CA5)
+ routes/session → 19 pass total / 0 fail
typecheck / lint / format → limpos
pnpm test → 1426 pass / 0 fail / 16 skip (zero regressão)
```

## Ajuste W1
- `auth-hook.ts`: `preHandlerHookHandler` → `preHandlerAsyncHookHandler`; helpers retornam `FastifyReply` (sem cast `as Promise<void>`).
