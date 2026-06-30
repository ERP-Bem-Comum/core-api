# AUTH-HTTP-LIST-USERS — Borda HTTP da listagem (US1)

**Size:** M · **Spec:** `specs/005-gestao-usuarios/` (US1, tasks T017/T021/T022/T023) · **Branch:** `005-gestao-usuarios`

## Escopo

Expor a US1 (listar/buscar/filtrar) na **borda HTTP** `GET /api/v1/users` + adapter Drizzle do read model.
Designs consultados com os especialistas `drizzle-orm-expert` e `fastify-server-expert` (ADR-0037: borda HTTP ativa).

- **Adapter Drizzle** `user-query.drizzle.ts` — `SELECT` + filtro status + `LIKE` CI (utf8mb4_unicode_ci) + `ORDER BY name` + `LIMIT/OFFSET` + `COUNT`. Índice `auth_user_name_idx` (migration).
- **Schemas Zod** `users-schemas.ts` — querystring (`page`, `pageSize∈{5,10,25}`, `search?`, `status active|inactive|all`) + response paginado.
- **Plugin** `users-plugin.ts` — `usersHttpPlugin(deps, {requireAuth, authorize})`; `GET /users`; `authorize('user:list')` (fail-closed); `sendResult` mapeando erros.
- **Wiring**: `composition.ts` (`listUsers` + `userQuery`; stub 503 no driver mysql até o Drizzle), `user-repository.in-memory.ts` (`snapshot`), `public-api/http.ts` (export), `src/server.ts` (registro `prefix: '/api/v1'`).

## Critérios de aceite (W0 — via `fastify.inject`, driver memory, sem Docker)

- **CA1**: `GET /api/v1/users` sem `Authorization` → **401**.
- **CA2**: token válido sem `user:list` → **403**.
- **CA3**: admin com `user:list` → **200** paginado (default page=1, pageSize=5; meta coerente).
- **CA4**: `pageSize=10` válido → 200, meta.pageSize=10.
- **CA5**: `pageSize=7` (∉ {5,10,25}) → **422**.
- **CA6**: `status=active` → 200, todos os itens com `status='active'`.
- **CA7**: `status=inactive` (nenhum desativado no seed) → 200, items vazios.
- **CA8**: `page=2&pageSize=5` com 5 usuários → 200, items vazios, meta.currentPage=2.

## Pendências (pré-merge, Docker)

- Adapter Drizzle validado de verdade só com MySQL real (`test:integration:auth`).
- Coleção Bruno `api-collections/users/list/` — `bru run` exige servidor + Docker.

## Decisões (dos especialistas)

- `status` borda `inactive` → domínio `disabled` (mapeado no handler).
- `pageSize` (não `limit`) na querystring (paridade com o use case); `meta` = shape do use case.
- Permission `user:list` (provisória; consolidar com `006`).
- Driver mysql: stub `err('user-query-unavailable')` até o Drizzle ser ligado (boot seguro).
