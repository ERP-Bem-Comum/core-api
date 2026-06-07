# W1 — Implementação GREEN — AUTH-HTTP-LIST-USERS

**Wave:** W1 · **Outcome:** GREEN · **Data:** 2026-06-07

## Implementação (designs consultados com especialistas)

**Consultoria:** `drizzle-orm-expert` (adapter Drizzle + índice) e `fastify-server-expert` (rota/schemas/wiring) — designs ancorados no código real e citando `handbook/reference/{drizzle,fastify}`.

**Arquivos novos:**
- `adapters/http/users-schemas.ts` — Zod querystring (`page`, `pageSize∈{5,10,25}`, `search?`, `status active|inactive|all`) + response paginado.
- `adapters/http/users-plugin.ts` — `usersHttpPlugin`; `GET /users`; `authorize('user:list')` fail-closed; `sendResult`; mapeia `inactive→disabled`.
- `adapters/persistence/repos/user-query.drizzle.ts` — `COUNT` + `SELECT` projetado, `LIKE` CI (utf8mb4_unicode_ci), filtro status, `ORDER BY name`, `LIMIT/OFFSET`; `try/catch → Result`.

**Edits:** `composition.ts` (wiring `userQuery` in-memory/**Drizzle real** + `listUsers`), `user-repository.in-memory.ts` (`snapshot`), `public-api/http.ts` (export), `server.ts` (registro `prefix: '/api/v1'`), `schemas/mysql.ts` (índice `auth_user_name_idx`), migration `0005`.

## Resultado

```
rota via fastify.inject: 8/8 (401, 403, 200 paginado, 400 pageSize inválido, status filter, paginação)
```

Ajuste vs design: query inválida → **400** (padrão do projeto: validação de querystring; 422 é para body semântico — espelha collaborators/acts).

## Pendências (Docker)
- Adapter Drizzle validado de verdade só com MySQL real (`test:integration:auth` + migrations 0004/0005).
- Coleção Bruno `api-collections/users/list/` (T023) — a fazer com `bruno-api-client-expert`; `bru run` exige Docker.
