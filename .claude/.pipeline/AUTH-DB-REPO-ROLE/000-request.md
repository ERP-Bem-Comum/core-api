# AUTH-DB-REPO-ROLE (P2) — RoleRepository Drizzle + mapper

## Origem

Fase P, ticket 3 (depende de P0 schema). Adiciona o adapter Drizzle do port `RoleRepository` (hoje só InMemory).
Reusa o driver auth (`openAuthMysql`, P1) e o schema `auth_*` (P0). Mesmo fluxo de papéis (W1 em duas mãos).
Materializa a **reconciliação valor↔entidade** do blueprint P0 (Decisão 2): `Permission` é valor no domínio,
`auth_permission(id, name)` é entidade — o mapper/repo resolve `name`↔`id`.

## Escopo

- **Mapper** (`adapters/persistence/mappers/role.mapper.ts`): `roleFromRows(roleRow, permRows) → Result<Role, RoleMapperError>`
  (`Role.create` + `Permission.parse`; `description` ignorado — não há no domínio); `roleToInsert(role, now)`.
- **Repo Drizzle** (`repos/role-repository.drizzle.ts`): `createDrizzleRoleStore(handle, clock) → { repository }`.
  - `save`: transação — upsert `auth_role` (SELECT-FOR-UPDATE → UPDATE/INSERT; `description` NULL) + reconciliar
    permissions: para cada `Permission` (string), **upsert `auth_permission`** por `name` (SELECT id WHERE name=? →
    INSERT se ausente, gerando `PermissionId`) + **replace `auth_role_permission`** (DELETE WHERE role_id + INSERT
    batch das associações `(role_id, permission_id)`). Tudo numa `db.transaction`.
  - `findById`: SELECT `auth_role` + JOIN `auth_role_permission`→`auth_permission` → reidratar `permissions[]`.
  - `list`: SELECT todos `auth_role` + JOIN; agrupar `permissions[]` por `role_id`.

## Critérios de aceitação (contract-suite compartilhada — InMemory **e** Drizzle)

A `role-repository.contract.ts` já cobre (sem alteração):
- **CA1:** save → findById retorna o role (com permissions).
- **CA2:** findById inexistente → ok(null).
- **CA3:** upsert (permissão adicionada via `Role.grant`) → findById reflete 2 permissions.
- **CA4:** list retorna todos os roles salvos.

### Drizzle-específico (`role-repository.drizzle.test.ts`, gated `MYSQL_INTEGRATION`)
- **CA5:** roda a contract-suite (CA1–CA4) contra o adapter Drizzle.
- **CA6 (reconciliação):** salvar dois roles que compartilham a **mesma** permission (`contract:delete`) → a
  `auth_permission` é criada **uma vez** (upsert idempotente por name); ambos os roles a reidratam.

## Decisões técnicas (DBA modela no W1a; não há decisão de negócio aberta)

1. **Upsert `auth_permission` por name** (não há `PermissionRepository`; permissions são valores). SELECT id WHERE
   name=? → INSERT (novo `PermissionId`) se ausente. **Sem `ON DUPLICATE KEY`** (ADR-0020). Idempotente.
2. **`auth_role.name` UNIQUE:** violação (`ER_DUP_ENTRY` em `auth_role_name_idx`) → **`'role-repo-unavailable'`**
   genérico (YAGNI — **nenhum** use case chama `roleRepo.save` ainda; `Role.create` não valida unicidade). Quando
   surgir `createRole`, estender o port com `'role-name-already-exists'` (análogo ao P1).
3. **`description`:** sem correspondente no domínio → `NULL` no insert; ignorado na reidratação.

## Fora de escopo
- `RefreshTokenRepository` Drizzle (P3). Wiring (P4). `createRole`/admin use case (futuro).

## Notas
- Skill: fluxo de papéis (DBA W1a → drizzle-orm-expert W1b → validação cruzada W2 → ts-quality-checker + integração W3).
- W0: criar `role-repository.drizzle.test.ts` (RED por adapter inexistente). Contract-suite InMemory já passa (não estender).
