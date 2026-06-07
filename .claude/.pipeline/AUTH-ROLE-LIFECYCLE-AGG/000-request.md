# AUTH-ROLE-LIFECYCLE-AGG

> Spec: `specs/006-gestao-acessos` (Phase 2 Foundational) · Tasks: T005 (RED) + T008 (impl) · Size: L→M

## Escopo

Estender o agregado `Role` (`src/modules/auth/domain/authorization/role.ts`) com ciclo de vida e validações de domínio que as user stories US5/US6/US7 consomem. **Domínio puro** — funções sobre `Readonly<>`, `Result<T,E>`, sem `throw` (rule domain.md).

Operações:

- **`status`** no tipo `Role` (`'active' | 'archived'`).
- **`create`** — nasce `active`; valida **nome** via `RoleName.create` (`name: RoleName`). A validação **⊆ catálogo fica em `setPermissions`** (e no use case `create-role`, US5) — o `create` low-level permanece permissivo para não quebrar reidratação/seed existentes.
- **`rehydrate`** — reconstrói do banco **com** `status` e permissões já persistidas (sem revalidar catálogo — confia no banco). Substitui `Role.create` no `role.mapper.ts`.
- **`rename(role, rawName)`** — novo nome via `RoleName.create`.
- **`setPermissions(role, perms)`** — substitui o conjunto; rejeita permissão fora do catálogo (`role-permission-not-in-catalog`).
- **`archive(role, isInUse)`** — `isInUse` ⇒ `err('role-in-use')` (FR-012); senão `status='archived'`.

Mantém `hasPermission`/`grant`/`revoke` existentes. `archive` recebe `isInUse: boolean` (o **use case** consulta o repo — o agregado permanece puro, sem I/O).

## Fora de escopo (re-scoping deliberado — registrado no EXECUTION-LOG)

- **T009 (eventos `Role*`)** → deferido. Mudar assinaturas para emitir evento quebra `role.mapper.ts` (reidratação ≠ criação) e **não há consumidor** (spec: "para AuditLog/futuro"; wiring outbox é T049). Vai com as US que emitirem, ou ticket próprio.
- **T011 (repo `create/update/archive/listAll` + `isInUse`)** → ticket irmão **`AUTH-ROLE-REPO-CRUD`** (adapter: mapper de `status`, `isInUse` via junção `auth_user_role`, in-memory + drizzle). Fecha de fato a Foundational.

## Critérios de aceitação

- **CA1**: `Role` tem `status: 'active' | 'archived'`; `name: RoleName`.
- **CA2**: `create` nasce `active`; nome inválido → `err('role-name-invalid')`. (catálogo não validado aqui — ver CA5.)
- **CA3**: `rehydrate` reconstrói com `status`/permissões do banco sem revalidar catálogo.
- **CA4**: `rename` aplica `RoleName.create` (normaliza/valida).
- **CA5**: `setPermissions` rejeita conjunto com permissão fora do catálogo (`role-permission-not-in-catalog`); dedup.
- **CA6**: `archive(role, true)` → `err('role-in-use')`; `archive(role, false)` → `status='archived'` (idempotente se já archived).
- **CA7**: imutabilidade (cópias via `immutable`); sem `throw`; `RoleError` string-union EN kebab-case.
- **CA8**: `role.mapper.ts` migrado para `rehydrate` — gate verde (não quebra reidratação existente).

## Pipeline

- **W0** (T005): `role-lifecycle.test.ts` RED.
- **W1** (T008): estender `role.ts` + migrar `role.mapper.ts` para `rehydrate` até GREEN.
- **W2/W3**: review read-only + gate completo (inclui integração auth — mapper toca persistência).
