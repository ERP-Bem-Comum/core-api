# Data Model — Gestão de Acessos (Fase 1)

Estende `auth/domain/authorization`. Tudo em `auth_*` (ADR-0014). Reusa `Permission`/`Role`/`authorize`.

---

## Agregado: `Role` (estendido)

> **Tabelas já existem** (`mysql.ts`): `auth_role` (:75), `auth_role_permission` (:143), `auth_user_role`
> (:181), `auth_permission` (:50). Esta feature **estende** `auth_role` (adiciona status) e adiciona
> operações ao agregado — não cria tabelas.

| Campo         | Tipo (domínio)                      | Persistência (`auth_role`)                   | Regra / Invariante                               |
| ------------- | ----------------------------------- | -------------------------------------------- | ------------------------------------------------ |
| `id`          | `RoleId` (branded, já existe)       | `id varchar(36)` PK (existe)                 | UUID v4.                                         |
| `name`        | `RoleName` (VO novo)                | `name varchar(64)` UNIQUE (existe)           | Único (`auth_role_name_idx`), normalizado.       |
| `description` | `string \| null` (já existe)        | `description varchar(255)` (existe)          | Opcional.                                        |
| `permissions` | `readonly Permission[]`             | junção `auth_role_permission` (existe)       | Cada item deve existir no catálogo (FK).         |
| `status`      | `'active' \| 'archived'` (**novo**) | `status varchar(16)` + CHECK (**migration**) | `archived` ⇒ não-atribuível. Padrão `auth_user`. |

### Operações (puras → `Result<Role, RoleError>`)

- `Role.create(name, permissions)` → valida nome único (no use case) + permissões ⊆ catálogo; nasce `active`; `RoleCreated`.
- `Role.rename(role, name)` → renomeação; valida unicidade (no use case); `RoleRenamed`.
- `Role.setPermissions(role, perms)` → substitui o conjunto (perms ⊆ catálogo); `RolePermissionsChanged`.
- `Role.archive(role, isInUse)` → se `isInUse` ⇒ erro `role-in-use` (bloqueia, FR-012); senão `status='archived'` + `RoleArchived`. (verbo de negócio: "desativar")

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

| Evento                     | Quando                                |
| -------------------------- | ------------------------------------- |
| `RoleCreated`              | criação de papel                      |
| `RoleRenamed`              | renomeação de papel                   |
| `RolePermissionsChanged`   | edição do conjunto de permissões      |
| `RoleArchived`             | arquivamento ("desativação") de papel |
| `RoleAssigned` (já existe) | atribuição a usuário                  |
| `RoleRevokedFromUser`      | revogação de papel de usuário         |

Consumidor provável: AuditLog (diferido até identidade/RBAC — agora habilitado, ADR-0024/0022).
