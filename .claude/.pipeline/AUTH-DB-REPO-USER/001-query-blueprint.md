# Query Blueprint (W1a — DBA) — AUTH-DB-REPO-USER

**Autor:** `mysql-database-expert` (agentId a23ee42c2aaeb2271) · **Data:** 2026-05-27 · **Read-only** (registrado por Claude).

## Decisões-chave (com citação refman/Ramakrishnan & Gehrke)

1. **Timestamps:** `created_at`/`updated_at` **não** são atributo de domínio (User não os carrega). → `Clock`
   injetado: `createDrizzleUserStore(handle, clock)`; `const now = clock.now()` no topo do `save`. Testável.
2. **Upsert `auth_user`:** SELECT por id `.for('update')` → UPDATE ou INSERT. **Não** `ON DUPLICATE KEY` —
   ODKU dispara em qualquer UNIQUE (incl. email), sobrescreveria row de outro user (igual ao contracts:63-73).
   EXPLAIN: `type=const` (PK).
3. **Replace `auth_user_role`:** `DELETE WHERE user_id=?` + INSERT batch (skip se `roles[]` vazio).
   Replace > delta (cardinalidade baixa 2–5 roles; `assigned_at` é "última atribuição", histórico vai no evento).
   DELETE EXPLAIN: `type=ref` (prefixo `user_id` da PK composta). FK `auth_urt_role_fk` RESTRICT → role inexistente
   = errno 1451 (≠ 1062) → `user-repo-unavailable` (cobre CA9).
4. **`ER_DUP_ENTRY` → `email-already-registered`:** `isEmailDupEntry(e)` = `errno===1062` **E**
   `sqlMessage.includes('auth_user_email_idx')` (mysql2 expõe nome do índice na `sqlMessage`). Distinguir do
   dup de PK (corrida) → esse é `user-repo-unavailable`. `try/catch` direto no `save` (não o `safe()` genérico).
5. **Reidratação: 3 queries separadas** (recomendado, **não** JOIN único — evita cartesiano N×M com dados do user
   duplicados por linha):
   - Q1: `auth_user` por PK (`findById`, `type=const`) ou `auth_user_email_idx` (`findByEmail`, `type=const`). `undefined` → `ok(null)`.
   - Q2: `auth_user_role` JOIN `auth_role` WHERE `user_id=?` (`ref` prefixo PK + `eq_ref` PK role). Vazio → `ok(user, roles=[])`.
   - Q3: `auth_role_permission` JOIN `auth_permission` WHERE `role_id IN (...)` (`range` prefixo PK + `eq_ref`). `inArray` do Drizzle; skip se vazio.
   - Sem full scan em nenhuma. Padrão 1+N do contracts (contract-repository.drizzle.ts:156-192).
6. **Mapper `userFromRows(userRow, roleRows, permRows)` → `Result<User, UserMapperError>`:** agrupa perms por
   `role_id` (Map), `Role.create`+`Permission.parse` por role, dispatcher por `status` → ActiveUser|DisabledUser;
   falha de parse → MapperError → repo converte para `user-repo-unavailable` (padrão `buildContract`).

## Instruções ao implementador (W1b) — resumo
- Port: `UserRepositoryError += 'email-already-registered'`.
- Factory `createDrizzleUserStore(handle, clock)`. `save` numa `db.transaction`: SELECT FOR UPDATE → UPDATE/INSERT
  → DELETE user_role → INSERT batch (skip vazio). Erro via `isEmailDupEntry`.
- `findById`/`findByEmail`: 3 queries em `safe(...)`; `inArray` na Q3; skip Q3 se sem roles.
- Schema: `authUser`/`authUserRole`/`authRole`/`authRolePermission`/`authPermission`.
