# Schema Blueprint (W1a — DBA) — AUTH-DB-SCHEMA

**Autor:** `mysql-database-expert` (agentId a1363636e36a3f934) · **Data:** 2026-05-27 · **Read-only** (registrado por Claude).

> Blueprint DDL canônico das 6 tabelas `auth_*`. O `drizzle-orm-expert` (W1b) traduz para `schemas/mysql.ts`;
> o DBA valida a migration emitida vs. este documento (W2).

## Resolução das 4 decisões de modelagem

1. **`auth_user.status` sem ENUM** → `VARCHAR(16)` + `CHECK (status IN ('active','disabled'))` + CHECK
   bicondicional `(status='disabled') = (disabled_at IS NOT NULL)` (espelha `ctr_contracts_ended_at_consistency_chk`).
   Cita ADR-0020 §"Continuam proibidas" (ENUM → usar `VARCHAR(N)+CHECK`).
2. **Permission valor↔entidade** → `auth_permission(id, name)` é entidade no schema; `auth_role_permission`
   referencia `permission_id` (FK), **não** `name` (evita lookup em índice secundário + `ON UPDATE CASCADE` em rename).
   O **mapper reconcilia**: escrita resolve `name`→`id` (upsert em `auth_permission`); leitura faz JOIN, lê `name`,
   `Permission.parse(name)`. O `id` nunca cruza a borda — domínio permanece puro (Permission = branded string).
3. **FKs `ON DELETE`** → **RESTRICT** em todas (user_role, role_permission, refresh_token.user_id). Cita
   best-practice 06 ("CASCADE em prod é antipattern por amplificação de locks; RESTRICT default + lógica no domínio").
   `ON UPDATE RESTRICT` (UUIDs imutáveis).
4. **`replaced_by`** → `VARCHAR(36) NULL` **sem self-FK**. Razões: rotação atômica não exigir ordem de insert;
   evitar ciclo no purge; é referência de auditoria one-way (`RefreshTokenId | null` no domínio), não integridade estrutural.

## DDL alvo (MySQL 8.4 InnoDB)

### `auth_user`
- `id` VARCHAR(36) bin PK · `email` VARCHAR(254) unicode_ci **UNIQUE** (Q1 findByEmail) · `password_hash` VARCHAR(255) **NULL** (OIDC-ready) · `status` VARCHAR(16) · `disabled_at` DATETIME(3) NULL · `created_at`/`updated_at` DATETIME(3).
- CHECK `auth_user_status_chk` (status IN active/disabled); CHECK `auth_user_disabled_consistency_chk` `(status='disabled')=(disabled_at IS NOT NULL)`.

### `auth_role`
- `id` VARCHAR(36) bin PK · `name` VARCHAR(64) unicode_ci **UNIQUE** · `description` VARCHAR(255) NULL · timestamps.
- CHECK `auth_role_name_nonempty_chk` (CHAR_LENGTH(name)>0).

### `auth_permission`
- `id` VARCHAR(36) bin PK · `name` VARCHAR(128) **bin** **UNIQUE** (mapper name→id) · `created_at`.
- CHECK `auth_permission_name_format_chk` REGEXP_LIKE `^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$`.

### `auth_role_permission` (N:N)
- PK (`role_id`,`permission_id`) bin · INDEX `auth_rp_permission_idx`(permission_id) (FK index — InnoDB não cobre 2ª col da PK).
- FK `auth_rp_role_fk`→auth_role.id RESTRICT/RESTRICT; FK `auth_rp_permission_fk`→auth_permission.id RESTRICT/RESTRICT.

### `auth_user_role` (N:N)
- PK (`user_id`,`role_id`) bin · `assigned_at` DATETIME(3) (rastreabilidade; `assigned_by` é do evento, não da junção) · INDEX `auth_urt_role_idx`(role_id).
- FK `auth_urt_user_fk`→auth_user.id RESTRICT; FK `auth_urt_role_fk`→auth_role.id RESTRICT.

### `auth_refresh_token`
- `id` VARCHAR(36) bin PK · `user_id` VARCHAR(36) bin · `token_hash` CHAR(64) bin **UNIQUE** (Q4) · `issued_at`/`expires_at` DATETIME(3) · `revoked_at` DATETIME(3) NULL · `replaced_by` VARCHAR(36) NULL bin (sem FK).
- INDEX composto `auth_rt_user_revoked_idx`(`user_id`,`revoked_at`) (Q5 `WHERE user_id=? AND revoked_at IS NULL`; refman optimization.part02.md:190 — IS NULL usa índice).
- CHECK `auth_rt_expiry_chk` (expires_at>issued_at); CHECK `auth_rt_hash_nonempty_chk`; FK `auth_rt_user_fk`→auth_user.id RESTRICT.

## Ordem de criação (migration) / drop (rollback)
Criação: `auth_permission` → `auth_role` → `auth_user` → `auth_role_permission` → `auth_user_role` → `auth_refresh_token`.
Drop (inverso): refresh_token → user_role → role_permission → user → role → permission.

## Riscos/trade-offs registrados
- [MÉDIO] email `utf8mb4_unicode_ci` (rede de unicidade case-insensitive) vs `_bin` — escolhido ci (defesa). 
- [BAIXO] índice `(user_id,revoked_at)` cresce com tokens revogados → mitigar com purge periódico.
- [BAIXO] `CHAR(64)` em utf8mb4 ≈ VARCHAR (sem economia real) — mantido por clareza semântica.
- [BAIXO] `replaced_by` sem FK → mapper valida com `RefreshTokenId.parse` → `Result<T, MapperError>`.

## Notas ao implementador Drizzle (W1b) — resumo das 10
1. CHARSET/COLLATE manual no SQL pós-`db:generate` (drizzle 0.45 não expõe): tabela `utf8mb4_unicode_ci`; UUIDs/`token_hash` `utf8mb4_bin`.
2. Schema em `src/modules/auth/adapters/persistence/schemas/mysql.ts`; migration em `.../migrations/mysql/`.
3. CHECK REGEXP via `sql` template no `check()`.
4. `char('token_hash', { length: 64 })`. 5. índice composto não-único `(userId, revokedAt)`.
6. `replaced_by` `varchar(36)` **sem** `.references()` + comentário (Decisão 4).
7. FKs com nome explícito via `foreignKey({ name: 'auth_xxx_yyy_fk' })` (nomes <64 chars).
8. ordem de export = ordem de criação. 9. `assigned_at` explícito em user_role.
10. estender `schema-hardening.test.ts` (W3) via INFORMATION_SCHEMA (colunas, collation UUID, CHECKs, DELETE_RULE='RESTRICT').
