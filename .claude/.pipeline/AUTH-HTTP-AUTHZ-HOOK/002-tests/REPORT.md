# W0 — Testes RED — AUTH-HTTP-AUTHZ-HOOK (H2)

**Wave:** W0 · **Skill:** tdd-strategist · **Outcome:** RED · **Data:** 2026-05-28

## Escrito

`tests/modules/auth/adapters/http/authz-hook.test.ts` — reusa composition/plugin do H1; helper `loginToken`.

| CA | Asserção |
| :-- | :-- |
| CA1 | `GET /me` com `Authorization: Bearer <accessToken>` → 200 `{userId}` |
| CA2 | `GET /me` sem header → 401 |
| CA3 | `GET /me` com Bearer garbage → 401 |
| CA4 | `makeRequireAuth` e `makeAuthorize` exportados de `public-api/http.ts` (mecanismo p/ rotas futuras) |
| CA5 | `/docs/json` contém `/api/v2/auth/me` |

## RED
```
node --test authz-hook.test.ts
✖ fail  (makeRequireAuth/makeAuthorize não exportados; /me inexistente; AuthHttpDeps sem verifyAccessToken)
```

GREEN quando o W1: `AuthHttpDeps += verifyAccessToken`; `auth-hook.ts` (`makeRequireAuth`/`makeAuthorize`);
`GET /me` com `preHandler: requireAuth` decorando `req.userId`; exports no `public-api/http.ts`; bearer no OpenAPI.
