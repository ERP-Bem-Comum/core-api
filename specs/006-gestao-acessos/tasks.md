# Tasks: Gestão de Acessos (Papéis e Permissões)

**Input**: Design documents from `/specs/006-gestao-acessos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: **OBRIGATÓRIOS** — TDD fail-first W0→W3 (constituição, Princípio I). Suíte RED antes de `src/`.

**Organization**: por user story (P1→P3). Estende o RBAC já existente no `auth` (`Permission`/`Role`/`authorize`/`assign-role`/`list-permissions`/`list-user-permissions`). **Tabelas RBAC já existem** (`auth_permission`/`auth_role`/`auth_role_permission`/`auth_user_role`); a única migration é `status` em `auth_role`.

## Format: `[ID] [P?] [Story] Description`

> **Mapa de tickets** (W0→W3): `AUTH-PERMISSION-CATALOG`, `AUTH-ROLE-NAME-VO`, `AUTH-ROLE-SCHEMA-STATUS`,
> `AUTH-ROLE-LIFECYCLE-AGG`, `AUTH-USECASE-USER-PERMISSIONS`, `AUTH-USECASE-LIST-PERMISSIONS`,
> `AUTH-USECASE-LIST-ROLES`, `AUTH-USECASE-ASSIGN-REVOKE`, `AUTH-USECASE-CREATE-ROLE`,
> `AUTH-USECASE-UPDATE-ROLE`, `AUTH-USECASE-ARCHIVE-ROLE`.

> **Dependência inter-spec**: nomes de permission `user:*` exibidos/consumidos vêm da `005` (T048 de lá);
> esta spec define `role:*`. Coordenar o catálogo único (T004 abaixo).

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Mapear o RBAC atual em `src/modules/auth/domain/authorization/` (`role.ts`, `permission.ts`, `role-repository.ts`, `authorize.ts`) e os use cases `assign-role`/`list-permissions`/`list-user-permissions`; anotar assinaturas para reuso.
- [ ] T002 [P] Confirmar as tabelas existentes em `src/modules/auth/adapters/persistence/schemas/mysql.ts` (`auth_permission`, `auth_role`, `auth_role_permission`, `auth_user_role`) e o `role-repository.drizzle.ts`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: catálogo em código + `RoleName` + status do papel + extensão do agregado `Role`.

### Tests RED

- [ ] T003 [P] Suíte RED do catálogo em `tests/modules/auth/domain/authorization/permission-catalog.test.ts` (conjunto canônico não-vazio, sem duplicatas, todas no formato `resource:action`).
- [ ] T004 [P] Suíte RED de `RoleName` em `tests/modules/auth/domain/authorization/role-name.test.ts` (normaliza/trim; não-vazio; comprimento).
- [ ] T005 Suíte RED do ciclo de vida em `tests/modules/auth/domain/authorization/role-lifecycle.test.ts` (`create` nasce `active`; `setPermissions` rejeita permissão fora do catálogo; `archive` bloqueia se em uso).

### Implementação

- [ ] T006 [P] Catálogo fixo `permission-catalog.ts` em `src/modules/auth/domain/authorization/` (fonte das permissions `user:*`, `role:*`, `contract:mass-approve`). (coordena com `005`)
- [ ] T007 [P] VO `RoleName` em `src/modules/auth/domain/authorization/role-name.ts` (branded + smart constructor `Result`).
- [ ] T008 Estender o agregado em `src/modules/auth/domain/authorization/role.ts`: campo `status` (`active`/`archived`); funções `create`, `rename`, `setPermissions` (⊆ catálogo), `archive(isInUse)`. (depende de T006, T007)
- [ ] T009 Eventos em `src/modules/auth/domain/authorization/events.ts`: `RoleCreated`, `RoleRenamed`, `RolePermissionsChanged`, `RoleArchived`, `RoleRevokedFromUser`. (depende de T008)
- [ ] T010 Migration: adicionar `status varchar(16)` + CHECK `IN ('active','archived')` em `auth_role` (schema + `pnpm run db:generate`); seed/upsert do catálogo em `auth_permission`. (depende de T008)
- [ ] T011 Estender `role-repository` (`.drizzle.ts` + `.in-memory.ts`) com `create`/`update`/`archive`/`listAll` e checagem "papel em uso" (junção `auth_user_role`). (depende de T008, T010)

**Checkpoint**: catálogo, VO, status e agregado prontos.

---

## Phase 3: User Story 1 - Permissões efetivas de um usuário (Priority: P1) 🎯 MVP

**Goal**: consultar a união das permissões dos papéis de um usuário.

**Independent Test**: usuário com 2 papéis → união correta; sem papéis → vazio.

**Ticket**: `AUTH-USECASE-USER-PERMISSIONS` (reuso de `list-user-permissions`).

### Tests RED

- [ ] T012 [P] [US1] Suíte RED em `tests/modules/auth/application/use-cases/list-user-permissions.test.ts` (união; vazio; inclui `contract:mass-approve` quando presente).

### Implementação

- [ ] T013 [US1] Confirmar/estender `list-user-permissions` em `src/modules/auth/application/use-cases/list-user-permissions.ts` (reuso). (depende de Phase 2)
- [ ] T014 [US1] Rota `GET /api/v1/users/:id/permissions` em `src/modules/auth/adapters/http/`. (depende de T013)
- [ ] T015 [P] [US1] Subcomando CLI `permissoes-do-usuario --id`. (depende de T013)

**Checkpoint**: US1 (MVP — base da auditoria de acesso).

---

## Phase 4: User Story 2 - Catálogo de permissões (Priority: P1)

**Goal**: listar todas as permissões disponíveis (catálogo fixo).

**Independent Test**: catálogo completo, sem duplicatas.

**Ticket**: `AUTH-USECASE-LIST-PERMISSIONS` (reuso de `list-permissions`).

### Tests RED

- [ ] T016 [P] [US2] Suíte RED em `tests/modules/auth/application/use-cases/list-permissions.test.ts` (catálogo do código; sem duplicatas).

### Implementação

- [ ] T017 [US2] Confirmar/estender `list-permissions` para ler do `permission-catalog.ts`. (depende de Phase 2)
- [ ] T018 [US2] Rota `GET /api/v1/permissions` (read-only). (depende de T017)
- [ ] T019 [P] [US2] Subcomando CLI `listar-permissoes`. (depende de T017)

**Checkpoint**: US1 + US2.

---

## Phase 5: User Story 3 - Listar papéis (Priority: P1)

**Goal**: listar papéis com nome + permissões.

**Independent Test**: cada papel com seu conjunto de permissões.

**Ticket**: `AUTH-USECASE-LIST-ROLES`.

### Tests RED

- [ ] T020 [P] [US3] Suíte RED em `tests/modules/auth/application/use-cases/list-roles.test.ts`.
- [ ] T021 [US3] Contract suite RED do repo em `tests/modules/auth/adapters/persistence/role-repository.suite.ts` (in-memory + Drizzle/MySQL).

### Implementação

- [ ] T022 [US3] Use case `list-roles` em `src/modules/auth/application/use-cases/list-roles.ts`. (depende de Phase 2)
- [ ] T023 [US3] Rota `GET /api/v1/roles`. (depende de T022)
- [ ] T024 [P] [US3] Subcomando CLI `listar-papeis`. (depende de T022)

**Checkpoint**: US1–US3 (leitura completa de acessos).

---

## Phase 6: User Story 4 - Atribuir e revogar papel (Priority: P2)

**Goal**: conceder/remover papel a usuário (idempotente).

**Independent Test**: atribuir aumenta permissões; revogar reverte; ator sem permissão → negado.

**Ticket**: `AUTH-USECASE-ASSIGN-REVOKE` (assign-role já existe; revoke é novo).

### Tests RED

- [ ] T025 [P] [US4] Suíte RED em `tests/modules/auth/application/use-cases/revoke-role.test.ts` (idempotência; fail-closed; bloqueio de auto-rebaixamento, FR-010).

### Implementação

- [ ] T026 [US4] Use case `revoke-role` em `src/modules/auth/application/use-cases/revoke-role.ts` (par do `assign-role`; protege lockout). (depende de Phase 2)
- [ ] T027 [US4] Rotas `POST /api/v1/users/:id/roles` (reuso assign) e `DELETE .../roles/:roleId` (revoke). (depende de T026)
- [ ] T028 [P] [US4] Subcomandos CLI `atribuir-papel` / `revogar-papel`. (depende de T026)

**Checkpoint**: US1–US4 (distribuição de acesso operacional).

---

## Phase 7: User Story 5 - Criar papel (Priority: P2)

**Goal**: criar papel com nome único e permissões do catálogo.

**Independent Test**: papel criado aparece na listagem; nome duplicado → conflito; permissão fora do catálogo → recusa.

**Ticket**: `AUTH-USECASE-CREATE-ROLE`.

### Tests RED

- [ ] T029 [P] [US5] Suíte RED em `tests/modules/auth/application/use-cases/create-role.test.ts` (nome único; permissões ⊆ catálogo).

### Implementação

- [ ] T030 [US5] Use case `create-role` em `src/modules/auth/application/use-cases/create-role.ts`. (depende de Phase 2)
- [ ] T031 [US5] Rota `POST /api/v1/roles`. (depende de T030)
- [ ] T032 [P] [US5] Subcomando CLI `criar-papel --name --perm …`. (depende de T030)

**Checkpoint**: US1–US5.

---

## Phase 8: User Story 6 - Editar papel (Priority: P2)

**Goal**: alterar nome/permissões; propaga às permissões efetivas dos usuários.

**Independent Test**: adicionar permissão a um papel reflete nos usuários que o possuem.

**Ticket**: `AUTH-USECASE-UPDATE-ROLE`.

### Tests RED

- [ ] T033 [P] [US6] Suíte RED em `tests/modules/auth/application/use-cases/update-role.test.ts` (propagação por referência; nome duplicado; permissão fora do catálogo).

### Implementação

- [ ] T034 [US6] Use case `update-role` (rename + setPermissions) em `src/modules/auth/application/use-cases/update-role.ts`. (depende de Phase 2)
- [ ] T035 [US6] Rota `PUT /api/v1/roles/:id`. (depende de T034)
- [ ] T036 [P] [US6] Subcomando CLI `editar-papel`. (depende de T034)

**Checkpoint**: US1–US6.

---

## Phase 9: User Story 7 - Desativar/arquivar papel (Priority: P3)

**Goal**: arquivar papel (não-atribuível); bloquear se em uso.

**Independent Test**: arquivar papel sem uso (ok); arquivar papel atribuído (bloqueado).

**Ticket**: `AUTH-USECASE-ARCHIVE-ROLE`.

### Tests RED

- [ ] T037 [P] [US7] Suíte RED em `tests/modules/auth/application/use-cases/archive-role.test.ts` (sem uso → arquiva; em uso → `role-in-use`).

### Implementação

- [ ] T038 [US7] Use case `archive-role` em `src/modules/auth/application/use-cases/archive-role.ts` (checa junção `auth_user_role`). (depende de Phase 2)
- [ ] T039 [US7] Rota `PATCH /api/v1/roles/:id/deactivate` (409 se em uso). (depende de T038)
- [ ] T040 [P] [US7] Subcomando CLI `desativar-papel`. (depende de T038)

**Checkpoint**: todas as stories funcionais.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T041 [P] Autorização fail-closed em todas as rotas (`role:read|create|update|assign|revoke`); seed das permissions de gestão no catálogo.
- [ ] T042 Wiring de outbox para os eventos `Role*` (hoje use cases retornam evento no output — confirmar publicação).
- [ ] T043 E2E da CLI real em `tests/cli/` (criar papel → atribuir → checar permissões efetivas).
- [ ] T044 Integração MySQL (`pnpm run test:integration`) para `role-repository.drizzle` e junções — atrás de `*_INTEGRATION=1`.
- [ ] T045 [P] Rodar `quickstart.md` ponta a ponta.
- [ ] T046 Gate W3 final por ticket: `pnpm run typecheck && pnpm run format:check && pnpm run lint && pnpm test`.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (1)** → **Foundational (2, BLOQUEIA)** → **User Stories (3–9)** → **Polish (10)**.
- US1–US3 (P1, leitura) primeiro; US4–US6 (P2, escrita); US7 (P3).

### Dependências entre stories

- US4–US7 dependem do agregado `Role` estendido (Phase 2); independentes entre si após isso.
- US6 (editar) e US1 (permissões efetivas) demonstram a propagação por referência.
- US7 (arquivar) depende da checagem "em uso" (T011).

### Parallel Opportunities

- T003/T004 (RED) e T006/T007 (impl VO/catálogo) em paralelo.
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
2. **PARAR e VALIDAR**: `permissoes-do-usuario` via CLI.

### Incremental (um ticket por slice)

1. Foundational → base RBAC admin.
2. US1→US2→US3 (leitura: permissões/catálogo/papéis) → demo.
3. US4 (atribuir/revogar) → US5 (criar) → US6 (editar) → demo.
4. US7 (arquivar) → polish.
5. Cada slice fecha W0→W3.

---

## Notes

- **Reuso máximo**: `assign-role`, `list-permissions`, `list-user-permissions`, `role-repository`, tabelas RBAC e `authorize` já existem — esta spec **adiciona** revogação, CRUD e lifecycle.
- **Tests RED são pré-condição** (W0). Cada story ≈ um ticket de pipeline.
- Catálogo de permissões é **código** (fonte) + tabela `auth_permission` (espelho seedado, T010).
- Coordenar o `permission-catalog.ts` com a `005` (permissions `user:*`) — catálogo único.
