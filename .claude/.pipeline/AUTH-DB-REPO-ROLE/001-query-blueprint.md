# Query Blueprint (W1a — DBA) — AUTH-DB-REPO-ROLE

**Autor:** `mysql-database-expert` (agentId ae048b8e3b1288ed2) · **Data:** 2026-05-27 · **Read-only** (registrado por Claude).

> Reusa os padrões do P1 (`AUTH-DB-REPO-USER/001-query-blueprint.md`): factory `(handle, clock)`, `safe()`→Result,
> SELECT-FOR-UPDATE upsert, replace de junção, 2 queries p/ reidratação N:M, `inArray` com skip vazio. Abaixo só o **novo**.

## `save(role)` — transação (3 fases, ordem obrigatória por FK)

1. **Upsert `auth_role`** (igual P1): SELECT-FOR-UPDATE por id → UPDATE/INSERT; `description` NULL; `created_at`/`updated_at` via Clock.
2. **Upsert `auth_permission` por `name`** (NOVO — reconciliação valor→entidade): para cada `Permission`:
   - `SELECT id FROM auth_permission WHERE name=?` (`type=const`, índice `auth_permission_name_idx`).
   - ausente → `INSERT (id=novo PermissionId, name, created_at)`. **Sem `ON DUPLICATE KEY`** (ADR-0020).
   - **Corrida → ignore-then-reselect:** ao capturar `ER_DUP_ENTRY` (errno 1062 + `sqlMessage.includes('auth_permission_name_idx')`),
     re-`SELECT id WHERE name=?` (a permission é imutável; qualquer id lido é correto). **Não propaga erro** — idempotência total.
   - Isolar em `resolvePermissionId(tx, name, now): Promise<string>`. Loop **serial** (não `Promise.all` — evita deadlock no name_idx).
3. **Replace `auth_role_permission`**: `DELETE WHERE role_id=?` (`type=ref` prefixo PK) + INSERT batch `(role_id, permission_id)` (skip se vazio).

## `findById(id)` — 2 queries
- Q1: `auth_role` por PK (`type=const`); `undefined` → `ok(null)`.
- Q2: `auth_role_permission` JOIN `auth_permission` WHERE `role_id=?` (`ref` prefixo PK + `eq_ref` PK perm). `[]` → role com `permissions:[]`.

## `list()` — 2 queries (N+1-free)
- Q1: todos `auth_role` (`type=ALL` — tabela pequena, aceitável; paginar/indexar é decisão futura).
- Q2: `auth_role_permission` JOIN `auth_permission` WHERE `role_id IN (Q1 ids)` (`range` + `eq_ref`); skip se Q1 vazio.
- Agrupar `Map<role_id, PermJoinRow[]>` em memória; `buildRole(roleRow, perms)` por role. **Sem query por role.**

## Erros
- `auth_role_name_idx` dup → `'role-repo-unavailable'` genérico (Decisão 2 do 000-request — YAGNI, sem consumidor de save).
- `auth_permission_name_idx` dup → **não propaga** (ignore-then-reselect).
- FK RESTRICT (1451/1452) / I/O → `'role-repo-unavailable'` via `safe()`. mapper falha → `buildRole` → `'role-repo-unavailable'`.
- `save` **não** usa `safe()` genérico (precisa do `isPermissionNameDupEntry`); `findById`/`list` usam.

## Implementador (W1b)
- `createDrizzleRoleStore(handle, clock) → { repository }` (sem `reader` — o port não separa leitura).
- `resolvePermissionId(tx, name, now)` centraliza o ignore-then-reselect; `isPermissionNameDupEntry(e)` (errno 1062 + idx, checa `e.cause`).
- `list`: agrupamento via Map (não N+1). Mapper `roleFromRows(roleRow, permRows)` → `Result`; `description` ignorado; `roleToInsert(role, now)` com `description: null`.
