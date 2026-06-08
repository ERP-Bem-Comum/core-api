# Execution Log — 006-gestao-acessos

**Status:** ✅ 7 user stories entregues end-to-end · **Branch:** `feat/006-rbac` (a partir de `dev`) · **Atualizado:** 2026-06-08

> RBAC administrativo estendendo o módulo `auth`. Fundação (RoleName, catálogo, Role lifecycle, repo
> CRUD) já vinha de `dev` (tickets `AUTH-ROLE-*`/`AUTH-PERMISSION-*`). Este log cobre as US1-US7 (rotas
> HTTP + use cases) entregues em 2026-06-08. Borda HTTP-first (ADR-0037); validação E2E por coleção
> Bruno contra MySQL real + testes `fastify.inject`.

## User stories (W0→W1, design orientado pela skill `ports-and-adapters`)

- **US1** `GET /api/v1/users/:id/permissions` — permissões efetivas. `listPermissions` generalizado
  (`ActiveUser`→`UserCore`); use case `get-user-permissions`. (commit `3899e59`)
- **US2** `GET /api/v1/permissions` — catálogo read-only (FR-011). use case `list-permission-catalog`. (`76d0709`)
- **US3** `GET /api/v1/roles` — listar papéis. use case `list-roles`. (`db93430`)
- **US4** `POST/DELETE /api/v1/users/:id/roles` — atribuir/revogar (idempotente; anti-lockout FR-010).
  domínio `RoleRevoked` + `User.revokeRole`; use case `revoke-role`. (`17db0b4`)
- **US5** `POST /api/v1/roles` — criar (unicidade via list+filtro; valida catálogo via `setPermissions`). (`9008bb7`)
- **US6** `PUT /api/v1/roles/:id` — editar (patch parcial; FR-007 propagação automática pela junção). (`8766aad`)
- **US7** `PATCH /api/v1/roles/:id/deactivate` — arquivar (409 se em uso, FR-012). (`1877c00`)

Todas as rotas em `roles-plugin.ts` (criado na US1, estendido incrementalmente); wiring em
`composition.ts`/`public-api/http.ts`/`server.ts`.

## Validação

- **Unit (`fastify.inject` + use cases):** suíte completa verde — gate W3 final **2533 testes, 0 fail**
  (typecheck + format:check + lint + test todos verdes).
- **E2E Bruno (MySQL real):** `pnpm run test:e2e:bruno:auth` → **85 requests / 112 testes**, pastas
  `5-permissions/`, `6-roles/`, `7-role-mgmt/`. Cobre idempotência, anti-lockout 422 e o **409
  role-in-use** (validável só com a junção `auth_user_role` real). (commits `5e453da`, `5e453da`+, `7-role-mgmt`)
- **W2 code-review:** APPROVED (sem blockers/majors; 2 sugestões minor YAGNI).

## Pendências (não-bloqueantes)

- **T009 / T049 — eventos `Role*` + outbox:** deferidos por YAGNI (sem consumidor). Reabrir quando
  houver AuditLog ou consumidor cross-módulo.
- **T023 — contract suite Drizzle/MySQL do `role-repository`:** refactor para suíte compartilhada
  in-memory↔Drizzle (qualidade; `role-repository.drizzle.test.ts` já roda em `test:integration:auth`).
- **T051 — integração MySQL via `node:test`** para os fluxos de role (atrás de `*_INTEGRATION=1`).
- **T052 — `quickstart.md` ponta a ponta.**

## Próximo

PR `feat/006-rbac → dev` quando aprovado pelo dono. `dev` permanece intacta até lá.
- **2026-06-08** — **T023/T051 reconciliadas (via spec 007).** A contract suite compartilhada do `RoleRepository` (`role-repository.contract.ts`, `runRoleRepositoryContract` CA1-CA6) já existia desde `AUTH-ROLE-REPO-CRUD`, consumida por in-memory (7/7) e Drizzle/MySQL (verde em `test:integration:auth`, 40/40). O `tasks.md` é que não fora marcado. Fechadas no ticket `AUTH-ROLE-REPO-CONTRACT-SUITE` (US2 da 007).
