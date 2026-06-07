# Implementation Plan: Gestão de Acessos (Papéis e Permissões)

**Branch**: `006-gestao-acessos` | **Date**: 2026-06-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-gestao-acessos/spec.md`

## Summary

Adicionar o **lado administrativo do RBAC** ao módulo `auth`: catálogo de permissões (read-only, fixo em código), CRUD de papéis (`Role`) com ciclo de vida por desativação, e atribuição/revogação de papéis a usuários. Reusa integralmente o RBAC já existente (`Permission`, `Role`, `authorize`, `assign-role`, `list-permissions`, `list-user-permissions`). Spec irmã de `005-gestao-usuarios`; "aprovador em massa" é a permissão `contract:mass-approve` que a `005` exibe read-only.

## Technical Context

**Language/Version**: TypeScript 6.0, Node.js 24 LTS, ESM/NodeNext

**Primary Dependencies**: Drizzle ORM + `mysql2` (MySQL 8.4), Fastify 5 + Zod/OpenAPI (ADR-0025/0027/0028)

**Storage**: MySQL 8.4 (`auth_*`: papéis, permissões-de-papel, usuário-papel); outbox `core.outbox`

**Testing**: `node:test` + strip-types; contract suites; integração atrás de `*_INTEGRATION=1`

**Target Platform**: Servidor Linux (container), processo único

**Project Type**: Web service (backend) — borda HTTP + paridade CLI

**Performance Goals**: Consulta de permissões efetivas e catálogo instantâneas (poucos papéis/permissões)

**Constraints**: Domínio puro (`Result<T,E>`); fail-closed (FR-009); catálogo de permissões imutável em runtime (FR-011)

**Scale/Scope**: ~6 use cases novos (list-roles, create-role, update-role, deactivate-role, revoke-role, list-permissions-catalog), 1 VO novo (`RoleName`), extensão do agregado `Role`, schema `auth_roles`/junções

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Princípio                 | Status | Nota                                                                                                                                           |
| ------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| I–III, VIII               | ✅     | TDD W0→W3, regressão zero, pnpm, TS strict.                                                                                                    |
| IV. Isolamento            | ✅     | **Estende `auth`** (sem novo BC); reuso do RBAC (ADR-0024).                                                                                    |
| V. Domínio puro           | ✅     | `Role.create/rename/setPermissions/deactivate` puros → `Result`; `RoleName` VO.                                                                |
| VI. MySQL + Drizzle       | ✅     | `auth_roles` + junções via `db:generate`; sem JSON/ENUM nativos.                                                                               |
| VII. CLI-first / HTTP     | ✅     | HTTP oficial (ADR-0025+); paridade CLI.                                                                                                        |
| IX. Consultoria + citação | ✅     | Decisão de fronteira (estender `auth`) citada em `005/research.md` (Evans, p.211) — mesma fronteira, reaproveitada aqui; ver `research.md` D1. |

**Resultado do gate**: PASS — sem violações. `Complexity Tracking` N/A.

## Project Structure

### Documentation (this feature)

```text
specs/006-gestao-acessos/
├── plan.md · spec.md · research.md · data-model.md · quickstart.md
├── contracts/   (http-roles.md, cli-roles.md)
└── checklists/requirements.md
```

### Source Code (repository root)

```text
src/modules/auth/
├── domain/authorization/
│   ├── role.ts                    # ESTENDIDO: create/rename/setPermissions/deactivate + status active
│   ├── role-name.ts               # NOVO VO (único, normalizado)
│   ├── permission-catalog.ts      # NOVO: catálogo fixo em código (fonte do list-permissions)
│   └── events.ts                  # NOVO: RoleCreated/RolePermissionsChanged/RoleDeactivated/RoleRevokedFromUser
├── application/use-cases/
│   ├── list-roles.ts · create-role.ts · update-role.ts · deactivate-role.ts   # NOVOS
│   ├── revoke-role.ts             # NOVO (par do assign-role existente)
│   └── list-permissions-catalog.ts# NOVO (ou reuso do list-permissions)
├── adapters/persistence/          # auth_roles + auth_role_permissions + auth_user_roles (Drizzle)
└── adapters/http/                 # +rotas /roles, /permissions, /users/:id/roles

tests/modules/auth/
├── domain/authorization/          # unit: role lifecycle, role-name, catalog
├── application/use-cases/         # unit: create/update/deactivate/revoke com fakes
└── adapters/                      # contract (role-repo) + integração (MySQL) atrás de opt-in
```

**Structure Decision**: Estender `src/modules/auth/domain/authorization/` e `application/`. Sem novo módulo (decisão DDD compartilhada com a 005).

## Complexity Tracking

> N/A — Constitution Check passou sem violações.

## Migrations Drizzle (core-api)

> **⚠️ Tabelas RBAC já existem** em `src/modules/auth/adapters/persistence/schemas/mysql.ts`:
> `auth_permission` (:50), `auth_role` (:75), `auth_role_permission` (:143), `auth_user_role` (:181),
> com unicidade de nome e CHECK de formato. `role-repository.drizzle.ts` já implementa o repositório.
> **Esta feature NÃO cria essas tabelas** — reusa e estende.

- **Mudanças de schema**: [x] **única**: adicionar status de ciclo de vida a `auth_role` (hoje só tem `id, name, description, created_at, updated_at` — sem `active`). Seguir o padrão do `auth_user`: **`status varchar(16)` + CHECK `IN ('active','archived')`**, não boolean (ADR-0020, consistência com `auth_user_status_chk`). · [ ] tabelas novas (nenhuma) · [ ] junções novas (já existem)
- **Prefixo de isolamento correto?** `auth_*` — ADR-0014: **sim**
- **Outbox**: novos eventos (`RoleCreated`, `RolePermissionsChanged`, `RoleDeactivated`, `RoleRevokedFromUser`) → `INSERT` em `core.outbox`: **sim** (hoje os use cases do auth retornam evento no output, sem publicar — confirmar wiring de outbox no W1).
- **Catálogo de permissões**: a tabela `auth_permission` é o **espelho persistido** (necessária para a FK de `auth_role_permission`); a **fonte** é o código (`permission-catalog.ts`), seedado/upserted na tabela. Não há CRUD de permissão em runtime (FR-011).
- **Comando**: `pnpm run db:generate` após editar `schema.ts`; conferir CHARSET/COLLATE e FKs à mão (ADR-0020).
- **Restrições MySQL 8** (ADR-0020): permissões de papel como linhas de junção (já modeladas), **não** JSON/ENUM; status como `varchar`+CHECK (não ENUM nativo).

## Contrato HTTP (Fase 2+ — ativo via ADR-0025)

- **Endpoints novos** (sob `auth/adapters/http`):
  - `GET /api/v1/permissions` — catálogo fixo (read-only). Permission: `role:read`.
  - `GET /api/v1/roles` · `POST /api/v1/roles` · `PUT /api/v1/roles/:id` · `PATCH /api/v1/roles/:id/deactivate`.
  - `GET /api/v1/users/:id/permissions` — permissões efetivas (reuso `list-user-permissions`).
  - `POST /api/v1/users/:id/roles` (atribuir) · `DELETE /api/v1/users/:id/roles/:roleId` (revogar).
- **Autorização**: `role:read|create|update|assign|revoke`; `user:assign-role` já existe.
- **Regra de bloqueio**: `deactivate` de papel em uso → `409`/`422` orientando revogar antes (FR-012).

## Estimativa de Pipeline (W0 size)

- **Tamanho**: [x] **M→L** — reusa o RBAC existente (reduz risco), mas adiciona schema de junções, 6 use cases, lifecycle de papel e outbox.
- **Justificativa**: menor que a 005 por reaproveitar `Permission`/`Role`/`authorize`/`assign-role`; ainda assim cruza domínio (lifecycle), persistência (junções), borda HTTP e eventos. Fatiar por use case.
- **Plano de testes W0 (RED)**:
  - `tests/modules/auth/domain/authorization/role-name.test.ts` — unicidade/normalização.
  - `tests/modules/auth/domain/authorization/role.test.ts` — `setPermissions` valida contra catálogo; `deactivate` bloqueia se em uso.
  - `tests/modules/auth/application/use-cases/revoke-role.test.ts` — idempotência + fail-closed.
  - `tests/modules/auth/application/use-cases/create-role.test.ts` — nome duplicado (409), permissão fora do catálogo (recusa).
  - `tests/modules/auth/adapters/persistence/role-repository.suite.ts` — contract suite (in-memory + Drizzle/MySQL).
