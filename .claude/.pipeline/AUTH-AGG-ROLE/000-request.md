# AUTH-AGG-ROLE — Agregado `Role` (id, name, permissions[])

## Origem

Série [ADR-0024](../../../handbook/architecture/adr/0024-identity-and-rbac-auth-module.md), ticket D4
da Fase D — **primeiro agregado** do módulo `auth`. Backlog: [`.claude/.planning/AUTH-MODULE-TICKETS.md`](../../.planning/AUTH-MODULE-TICKETS.md).
`Role` agrega `readonly Permission[]` (D2, já entregue) e é referenciado pelo `User` (D5). Mapeia
`auth_role` + `auth_role_permission` (ADR-0024).

## Estado atual

- `domain/authorization/permission.ts` (D2, closed-green) — `Permission` branded.
- Infra de ID: `src/shared/utils/id.ts` (`newUuid`, `isUuidV4`); facade `src/shared/primitives/immutable.ts`.
  Padrão de ID a espelhar: `src/modules/contracts/domain/shared/contract-id.ts`.

## Dois arquivos

1. `domain/authorization/role-id.ts` — `RoleId = Brand<string, 'RoleId'>` + `generate()` (UUID v4) +
   `rehydrate(raw): Result<RoleId, RoleIdError>`.
2. `domain/authorization/role.ts` — agregado `Role` (não-brandado, §3.A.1) + operações puras.

## Critérios de aceitação

### `RoleId`
- **CA1:** `generate()` produz um id aceito por `rehydrate` (UUID v4 válido).
- **CA2:** `rehydrate(<uuid v4>)` → `ok(RoleId)`.
- **CA3:** `rehydrate('not-a-uuid')` → `err('role-id-invalid')`.

### `Role`
- **CA4 (create válido):** `create({ id, name, permissions })` com `name` não-vazio → `ok(Role)`; `name`
  **trimado**; permissions preservadas.
- **CA5 (nome vazio):** `name` vazio ou só espaços → `err('role-name-empty')`.
- **CA6 (dedupe):** permissions duplicadas no input são deduplicadas no `Role` criado.
- **CA7 (hasPermission):** `hasPermission(role, p)` → `true` se contida, `false` caso contrário.
- **CA8 (grant):** `grant(role, p)` adiciona; **idempotente** (grant de permissão já existente não duplica).
- **CA9 (revoke):** `revoke(role, p)` remove a permissão; ausência é no-op.

## Fora de escopo

- `RoleName` como VO próprio — `name` validado inline (`role-name-empty`); promover a VO só se reusado.
- Atribuição de Role a User (`assignRole`, A7) e persistência (`auth_role*`, P1).
- Evento `RoleCreated` — não consta no vocabulário do ADR-0024; `create` retorna só `Result<Role>`. Adicionar evento quando o use case de criação precisar.

## Notas

- **Skill:** `ts-domain-modeler`. Agregado **não-brandado** (§3.A.1); transições por spread + `immutable()`.
- Imutabilidade: `immutable({...})`; arrays via `[...]`/`filter`, nunca `push`/`splice`.
- **Idioma:** EN; erros kebab EN (`role-id-invalid`, `role-name-empty`).
- **Pipeline W0→W3:** RED em `tests/modules/auth/domain/authorization/{role-id,role}.test.ts`. ASCII puro.
