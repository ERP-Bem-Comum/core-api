# Data Model — Gestão de Acessos (Fase 1)

Estende `auth/domain/authorization`. Tudo em `auth_*` (ADR-0014). Reusa `Permission`/`Role`/`authorize`.

---

## Agregado: `Role` (estendido)

| Campo         | Tipo (domínio)                | Persistência                     | Regra / Invariante                           |
| ------------- | ----------------------------- | -------------------------------- | -------------------------------------------- |
| `id`          | `RoleId` (branded, já existe) | `auth_roles.id varchar(36)` PK   | UUID v4.                                     |
| `name`        | `RoleName` (VO novo)          | `auth_roles.name varchar UNIQUE` | Único, normalizado (trim/case).              |
| `permissions` | `readonly Permission[]`       | junção `auth_role_permissions`   | Cada item deve existir no **catálogo fixo**. |
| `active`      | `boolean` (novo)              | `auth_roles.active tinyint(1)`   | Inativo ⇒ não-atribuível.                    |

### Operações (puras → `Result<Role, RoleError>`)

- `Role.create(name, permissions)` → valida nome único (no use case) + permissões ⊆ catálogo; `RoleCreated`.
- `Role.rename(role, name)` → `RolePermissionsChanged`? não — renomeação; valida unicidade.
- `Role.setPermissions(role, perms)` → substitui o conjunto (perms ⊆ catálogo); `RolePermissionsChanged`.
- `Role.deactivate(role, isInUse)` → se `isInUse` ⇒ erro `role-in-use` (bloqueia, FR-012); senão `active=false` + `RoleDeactivated`.

---

## Value Object novo: `RoleName`

- Branded `string`. `RoleName.create(raw): Result<RoleName, 'role-name-invalid'>`.
- Normaliza (trim, colapsa espaços); não-vazio; comprimento limitado. Unicidade é regra de repositório.

---

## Catálogo de Permissões (fixo em código)

- `permission-catalog.ts` exporta o conjunto canônico de `Permission` (`resource:action`).
- Fonte do `list-permissions` (catálogo) e da validação de `Role.setPermissions`.
- Exemplos: `user:list|read|create|update|activate|deactivate`, `role:read|create|update|assign|revoke`,
  `contract:mass-approve` (= "aprovador em massa").

---

## Relações

```
User ──< auth_user_roles >── Role ──< auth_role_permissions >── Permission(catálogo)
        (atribuição N:N)            (composição N:N, perms ⊆ catálogo)
```

- **Atribuir** (`assign-role`, já existe): insere linha em `auth_user_roles` (idempotente).
- **Revogar** (`revoke-role`, novo): remove a linha (idempotente; no-op se ausente).
- **Permissões efetivas**: `união( perms(role) : role ∈ roles(user) )` — computada, não armazenada.

---

## Eventos de domínio (outbox — ADR-0015)

| Evento                     | Quando                           |
| -------------------------- | -------------------------------- |
| `RoleCreated`              | criação de papel                 |
| `RolePermissionsChanged`   | edição do conjunto de permissões |
| `RoleDeactivated`          | desativação de papel             |
| `RoleAssigned` (já existe) | atribuição a usuário             |
| `RoleRevokedFromUser`      | revogação de papel de usuário    |

Consumidor provável: AuditLog (diferido até identidade/RBAC — agora habilitado, ADR-0024/0022).
