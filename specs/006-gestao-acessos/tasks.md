# Tasks: Gestão de Acessos (Papéis e Permissões)

**Input**: Design documents from `/specs/006-gestao-acessos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-roles.md

**Tests**: **OBRIGATÓRIOS** — TDD fail-first W0→W3 (constituição, Princípio I). Suíte RED antes de `src/`.

**Borda (ADR-0037)**: HTTP-first. UX primária é a borda HTTP (`/api/v1`, Fastify + Zod/OpenAPI — ADR-0025/0027/0028); **sem CLI embutida** (ADR-0037 §2). Validação E2E por **coleção Bruno** (ADR-0034) + `fastify.inject` — nunca por subcomando CLI.

**Organization**: por user story (P1→P3). Estende o RBAC já existente no `auth` (`Permission`/`Role`/`authorize`/`assign-role`/`list-permissions`/`list-user-permissions`). **Tabelas RBAC já existem** (`auth_permission`/`auth_role`/`auth_role_permission`/`auth_user_role`); a única migration é `status` em `auth_role`.

## Format: `[ID] [P?] [Story] Description`

> **Mapa de tickets** (W0→W3): `AUTH-PERMISSION-CATALOG`, `AUTH-ROLE-NAME-VO`, `AUTH-ROLE-SCHEMA-STATUS`,
> `AUTH-ROLE-LIFECYCLE-AGG`, `AUTH-HTTP-USER-PERMISSIONS`, `AUTH-HTTP-LIST-PERMISSIONS`,
> `AUTH-HTTP-LIST-ROLES`, `AUTH-HTTP-ASSIGN-REVOKE`, `AUTH-HTTP-CREATE-ROLE`,
> `AUTH-HTTP-UPDATE-ROLE`, `AUTH-HTTP-ARCHIVE-ROLE`.

> **Dependência inter-spec**: nomes de permission `user:*` exibidos/consumidos vêm da `005` (T048 de lá);
> esta spec define `role:*`. Coordenar o catálogo único (T006 abaixo) — é o ponto que **destrava o T048 da 005**.

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Mapear o RBAC atual em `src/modules/auth/domain/authorization/` (`role.ts`, `permission.ts`, `role-repository.ts`, `authorize.ts`) e os use cases `assign-role`/`list-permissions`/`list-user-permissions`; anotar assinaturas para reuso.
- [ ] T002 [P] Confirmar as tabelas existentes em `src/modules/auth/adapters/persistence/schemas/mysql.ts` (`auth_permission`, `auth_role`, `auth_role_permission`, `auth_user_role`) e o `role-repository.drizzle.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: catálogo em código + `RoleName` + status do papel + extensão do agregado `Role`.

### Tests RED

- [x] T003 [P] Suíte RED do catálogo em `tests/modules/auth/domain/authorization/permission-catalog.test.ts` (conjunto canônico não-vazio, sem duplicatas, todas no formato `resource:action`). ✅ `AUTH-PERMISSION-CATALOG`
- [x] T004 [P] Suíte RED de `RoleName` em `tests/modules/auth/domain/authorization/role-name.test.ts` (normaliza/trim; não-vazio; comprimento). ✅ `AUTH-ROLE-NAME-VO`
- [ ] T005 Suíte RED do ciclo de vida em `tests/modules/auth/domain/authorization/role-lifecycle.test.ts` (`create` nasce `active`; `setPermissions` rejeita permissão fora do catálogo; `archive` bloqueia se em uso).

### Implementação

- [x] T006 [P] Catálogo fixo `permission-catalog.ts` em `src/modules/auth/domain/authorization/` (fonte das permissions `user:*`, `role:*`, `contract:mass-approve`). **Coordena com a `005` (T048) — catálogo único.** ✅ `AUTH-PERMISSION-CATALOG` (18 permissions; `isInCatalog`)
- [x] T007 [P] VO `RoleName` em `src/modules/auth/domain/authorization/role-name.ts` (branded + smart constructor `Result`). ✅ `AUTH-ROLE-NAME-VO`
- [ ] T008 Estender o agregado em `src/modules/auth/domain/authorization/role.ts`: campo `status` (`active`/`archived`); funções `create`, `rename`, `setPermissions` (⊆ catálogo), `archive(isInUse)`. (depende de T006, T007)
- [ ] T009 Eventos em `src/modules/auth/domain/authorization/events.ts`: `RoleCreated`, `RoleRenamed`, `RolePermissionsChanged`, `RoleArchived`, `RoleRevokedFromUser`. (depende de T008)
- [ ] T010 Migration: adicionar `status varchar(16)` + CHECK `IN ('active','archived')` em `auth_role` (schema + `pnpm run db:generate`); seed/upsert do catálogo em `auth_permission`. (depende de T008)
- [ ] T011 Estender `role-repository` (`.drizzle.ts` + `.in-memory.ts`) com `create`/`update`/`archive`/`listAll` e checagem "papel em uso" (junção `auth_user_role`). (depende de T008, T010)

**Checkpoint**: catálogo, VO, status e agregado prontos.

---

## Phase 3: User Story 1 - Permissões efetivas de um usuário (Priority: P1) 🎯 MVP

**Goal**: consultar a união das permissões dos papéis de um usuário.

**Independent Test**: usuário com 2 papéis → união correta; sem papéis → vazio.

**Ticket**: `AUTH-HTTP-USER-PERMISSIONS` (reuso de `list-user-permissions`).

### Tests RED

- [ ] T012 [P] [US1] Suíte RED em `tests/modules/auth/application/use-cases/list-user-permissions.test.ts` (união; vazio; inclui `contract:mass-approve` quando presente).
- [ ] T013 [P] [US1] Suíte RED de borda em `tests/modules/auth/adapters/http/user-permissions.route.test.ts` via `fastify.inject` (200 com união; 404 usuário inexistente; 403 fail-closed sem `role:read`).

### Implementação

- [ ] T014 [US1] Confirmar/estender `list-user-permissions` em `src/modules/auth/application/use-cases/list-user-permissions.ts` (reuso). (depende de Phase 2)
- [ ] T015 [US1] Rota `GET /api/v1/users/:id/permissions` em `src/modules/auth/adapters/http/roles-plugin.ts` (`role:read`; `sendResult`) + wiring (`composition.ts`/`public-api/http.ts`/`src/server.ts`). (depende de T014)
- [ ] T016 [P] [US1] Coleção Bruno `api-collections/auth/permissions/user-permissions/*.bru` (200 união; 404; 403). (depende de T015)

**Checkpoint**: US1 (MVP — base da auditoria de acesso).

---

## Phase 4: User Story 2 - Catálogo de permissões (Priority: P1)

**Goal**: listar todas as permissões disponíveis (catálogo fixo).

**Independent Test**: catálogo completo, sem duplicatas.

**Ticket**: `AUTH-HTTP-LIST-PERMISSIONS` (reuso de `list-permissions`).

### Tests RED

- [ ] T017 [P] [US2] Suíte RED em `tests/modules/auth/application/use-cases/list-permissions.test.ts` (catálogo do código; sem duplicatas).
- [ ] T018 [P] [US2] Suíte RED de borda em `tests/modules/auth/adapters/http/permissions-catalog.route.test.ts` via `fastify.inject` (200 catálogo completo; 403 sem `role:read`; sem rotas de escrita — FR-011).

### Implementação

- [ ] T019 [US2] Confirmar/estender `list-permissions` para ler do `permission-catalog.ts`. (depende de Phase 2)
- [ ] T020 [US2] Rota `GET /api/v1/permissions` (read-only, `role:read`) em `roles-plugin.ts` + wiring. (depende de T019)
- [ ] T021 [P] [US2] Coleção Bruno `api-collections/auth/permissions/catalog/*.bru` (200 sem duplicatas; 403; ausência de POST/PUT/DELETE). (depende de T020)

**Checkpoint**: US1 + US2.

---

## Phase 5: User Story 3 - Listar papéis (Priority: P1)

**Goal**: listar papéis com nome + permissões.

**Independent Test**: cada papel com seu conjunto de permissões.

**Ticket**: `AUTH-HTTP-LIST-ROLES`.

### Tests RED

- [ ] T022 [P] [US3] Suíte RED em `tests/modules/auth/application/use-cases/list-roles.test.ts`.
- [ ] T023 [US3] Contract suite RED do repo em `tests/modules/auth/adapters/persistence/role-repository.suite.ts` (in-memory + Drizzle/MySQL).
- [ ] T024 [P] [US3] Suíte RED de borda em `tests/modules/auth/adapters/http/list-roles.route.test.ts` via `fastify.inject` (200 papéis com permissões; 403 sem `role:read`).

### Implementação

- [ ] T025 [US3] Use case `list-roles` em `src/modules/auth/application/use-cases/list-roles.ts`. (depende de Phase 2)
- [ ] T026 [US3] Rota `GET /api/v1/roles` (`role:read`) em `roles-plugin.ts` + wiring. (depende de T025)
- [ ] T027 [P] [US3] Coleção Bruno `api-collections/auth/roles/list/*.bru` (200 com permissões; 403). (depende de T026)

**Checkpoint**: US1–US3 (leitura completa de acessos).

---

## Phase 6: User Story 4 - Atribuir e revogar papel (Priority: P2)

**Goal**: conceder/remover papel a usuário (idempotente).

**Independent Test**: atribuir aumenta permissões; revogar reverte; ator sem permissão → negado.

**Ticket**: `AUTH-HTTP-ASSIGN-REVOKE` (assign-role já existe; revoke é novo).

### Tests RED

- [ ] T028 [P] [US4] Suíte RED em `tests/modules/auth/application/use-cases/revoke-role.test.ts` (idempotência; fail-closed; bloqueio de auto-rebaixamento, FR-010).
- [ ] T029 [P] [US4] Suíte RED de borda em `tests/modules/auth/adapters/http/assign-revoke.route.test.ts` via `fastify.inject` (POST idempotente 200/201; DELETE idempotente 200/204; 422 auto-rebaixamento; 403 fail-closed).

### Implementação

- [ ] T030 [US4] Use case `revoke-role` em `src/modules/auth/application/use-cases/revoke-role.ts` (par do `assign-role`; protege lockout, FR-010). (depende de Phase 2)
- [ ] T031 [US4] Rotas `POST /api/v1/users/:id/roles` (reuso assign, `role:assign`) e `DELETE .../roles/:roleId` (revoke, `role:revoke`) em `roles-plugin.ts` + wiring. (depende de T030)
- [ ] T032 [P] [US4] Coleção Bruno `api-collections/auth/roles/assign-revoke/*.bru` (atribuir→permissões sobem; revogar→revertem; idempotência; 422 lockout; 403). (depende de T031)

**Checkpoint**: US1–US4 (distribuição de acesso operacional).

---

## Phase 7: User Story 5 - Criar papel (Priority: P2)

**Goal**: criar papel com nome único e permissões do catálogo.

**Independent Test**: papel criado aparece na listagem; nome duplicado → conflito; permissão fora do catálogo → recusa.

**Ticket**: `AUTH-HTTP-CREATE-ROLE`.

### Tests RED

- [ ] T033 [P] [US5] Suíte RED em `tests/modules/auth/application/use-cases/create-role.test.ts` (nome único; permissões ⊆ catálogo).
- [ ] T034 [P] [US5] Suíte RED de borda em `tests/modules/auth/adapters/http/create-role.route.test.ts` via `fastify.inject` (201 `{ id }`; 409 nome duplicado; 422 permissão fora do catálogo; 403 sem `role:create`).

### Implementação

- [ ] T035 [US5] Use case `create-role` em `src/modules/auth/application/use-cases/create-role.ts`. (depende de Phase 2)
- [ ] T036 [US5] Rota `POST /api/v1/roles` (`role:create`; 201/409/422) em `roles-plugin.ts` + wiring. (depende de T035)
- [ ] T037 [P] [US5] Coleção Bruno `api-collections/auth/roles/create/*.bru` (201; 409; 422; 403). (depende de T036)

**Checkpoint**: US1–US5.

---

## Phase 8: User Story 6 - Editar papel (Priority: P2)

**Goal**: alterar nome/permissões; propaga às permissões efetivas dos usuários.

**Independent Test**: adicionar permissão a um papel reflete nos usuários que o possuem.

**Ticket**: `AUTH-HTTP-UPDATE-ROLE`.

### Tests RED

- [ ] T038 [P] [US6] Suíte RED em `tests/modules/auth/application/use-cases/update-role.test.ts` (propagação por referência; nome duplicado; permissão fora do catálogo).
- [ ] T039 [P] [US6] Suíte RED de borda em `tests/modules/auth/adapters/http/update-role.route.test.ts` via `fastify.inject` (200 papel atualizado; 409 nome duplicado; 422 permissão fora do catálogo; 403 sem `role:update`).

### Implementação

- [ ] T040 [US6] Use case `update-role` (rename + setPermissions) em `src/modules/auth/application/use-cases/update-role.ts`. (depende de Phase 2)
- [ ] T041 [US6] Rota `PUT /api/v1/roles/:id` (`role:update`; 200/409/422) em `roles-plugin.ts` + wiring. (depende de T040)
- [ ] T042 [P] [US6] Coleção Bruno `api-collections/auth/roles/update/*.bru` (200; propagação às permissões efetivas; 409; 422; 403). (depende de T041)

**Checkpoint**: US1–US6.

---

## Phase 9: User Story 7 - Desativar/arquivar papel (Priority: P3)

**Goal**: arquivar papel (não-atribuível); bloquear se em uso.

**Independent Test**: arquivar papel sem uso (ok); arquivar papel atribuído (bloqueado).

**Ticket**: `AUTH-HTTP-ARCHIVE-ROLE`.

### Tests RED

- [ ] T043 [P] [US7] Suíte RED em `tests/modules/auth/application/use-cases/archive-role.test.ts` (sem uso → arquiva; em uso → `role-in-use`).
- [ ] T044 [P] [US7] Suíte RED de borda em `tests/modules/auth/adapters/http/archive-role.route.test.ts` via `fastify.inject` (200 desativado; 409 papel ainda atribuído; 403 sem `role:update`).

### Implementação

- [ ] T045 [US7] Use case `archive-role` em `src/modules/auth/application/use-cases/archive-role.ts` (checa junção `auth_user_role`). (depende de Phase 2)
- [ ] T046 [US7] Rota `PATCH /api/v1/roles/:id/deactivate` (`role:update`; 200/409 se em uso) em `roles-plugin.ts` + wiring. (depende de T045)
- [ ] T047 [P] [US7] Coleção Bruno `api-collections/auth/roles/deactivate/*.bru` (200 sem uso; 409 em uso; 403). (depende de T046)

**Checkpoint**: todas as stories funcionais.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T048 [P] Autorização fail-closed em todas as rotas (`role:read|create|update|assign|revoke`); seed das permissions de gestão no catálogo (`permission-catalog.ts` + `auth_permission`).
- [ ] T049 Wiring de outbox para os eventos `Role*` (hoje use cases retornam evento no output — confirmar publicação via ADR-0015).
- [ ] T050 Coleção Bruno `api-collections/auth/` consolidada (US1–US7) + runner `pnpm run test:e2e:bruno:auth` (`scripts/e2e-bruno-auth.sh`, espelhar `e2e-bruno-partners.sh`); **estende** a coleção `auth/` criada na `005`. Substitui o antigo E2E de CLI (ADR-0037 §3).
- [ ] T051 Integração MySQL (`pnpm run test:integration:auth`, atrás de `*_INTEGRATION=1`) para `role-repository.drizzle` e junções (`auth_role`/`auth_role_permission`/`auth_user_role`).
- [ ] T052 [P] Rodar `quickstart.md` ponta a ponta (via HTTP/Bruno, sem CLI).
- [ ] T053 Gate W3 final por ticket: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2, BLOQUEIA)** → **User Stories (3–9)** → **Polish (10)**.
- US1–US3 (P1, leitura) primeiro; US4–US6 (P2, escrita); US7 (P3).

### Dependências entre stories

- US4–US7 dependem do agregado `Role` estendido (Phase 2); independentes entre si após isso.
- US6 (editar) e US1 (permissões efetivas) demonstram a propagação por referência.
- US7 (arquivar) depende da checagem "em uso" (T011).

### Dependência inter-spec

- T006 (`permission-catalog.ts`) é o catálogo único compartilhado com a `005` — **destrava o T048 da `005`** (alinhar permissions `user:*`).

### Parallel Opportunities

- T003/T004 (RED) e T006/T007 (impl VO/catálogo) em paralelo.
- Dentro de cada US, a suíte RED de use case e a de borda (`fastify.inject`) são `[P]`; a coleção Bruna `[P]` corre após a rota.
- Após Phase 2, um ticket por story em paralelo.

---

## Parallel Example: Foundational (Phase 2)

```bash
# RED em paralelo:
T003 permission-catalog · T004 role-name
# Impl em paralelo (após RED):
T006 permission-catalog.ts · T007 role-name.ts
```

---

## Implementation Strategy

### MVP First (US1)

1. Phase 1 → Phase 2 (CRÍTICO) → Phase 3 (US1: permissões efetivas).
2. **PARAR e VALIDAR**: `GET /api/v1/users/:id/permissions` via Bruno + `fastify.inject` (ADR-0037).

### Incremental (um ticket por slice)

1. Foundational → base RBAC admin.
2. US1→US2→US3 (leitura: permissões/catálogo/papéis) → demo HTTP.
3. US4 (atribuir/revogar) → US5 (criar) → US6 (editar) → demo HTTP.
4. US7 (arquivar) → polish.
5. Cada slice fecha W0→W3, validado por coleção Bruno (nunca por CLI).

---

## Notes

- **Borda HTTP-first (ADR-0037)**: sem subcomandos CLI; toda capacidade é rota `/api/v1` validada por Bruno (ADR-0034) + `fastify.inject`. A CLI do domínio é aplicação à parte (`cli/`, binário `bc`) que **consome** esta borda.
- **Reuso máximo**: `assign-role`, `list-permissions`, `list-user-permissions`, `role-repository`, tabelas RBAC e `authorize` já existem — esta spec **adiciona** revogação, CRUD e lifecycle.
- **Tests RED são pré-condição** (W0). Cada story ≈ um ticket de pipeline.
- Catálogo de permissões é **código** (fonte) + tabela `auth_permission` (espelho seedado, T010).
- Coordenar o `permission-catalog.ts` com a `005` (permissions `user:*`) — catálogo único.
