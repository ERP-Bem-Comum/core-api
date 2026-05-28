# Validação cruzada (W2) — AUTH-DB-SCHEMA

## Round 1 — REJECTED (DBA `mysql-database-expert`, agentId abdd590a812de9f83)

Validou a migration `0000_flowery_demogoblin.sql` + `schema.ts` + `0000_snapshot.json` vs. o blueprint
(`001-schema-blueprint.md`) e ADR-0020. **Tudo correto** (6 tabelas, tipos canônicos, UUIDs bin, char(64),
6 CHECKs, 5 FKs RESTRICT nomeadas, índice composto, 4 decisões honradas) **exceto**:

### 🔴 Drift snapshot ↔ SQL (unicidade duplicada)
- `schema.ts:99` (`email`) e `:219` (`tokenHash`) declaram `.unique()` **E** `uniqueIndex(...)` separado.
- O snapshot registra **ambos** (`auth_user_email_unique` + `auth_user_email_idx`; idem token_hash), mas o SQL
  foi editado à mão para manter só o `_idx`. → o próximo `db:generate:auth` parte de estado fantasma (snapshot
  ≠ banco real); migrations futuras em `auth_user`/`auth_refresh_token` podem emitir DDL errado.
- **Fix:** remover `.unique()` de `email` e `tokenHash`, regenerar (`db:generate:auth`), re-editar CHARSET/COLLATE.

### 🟡 Ordem das `CREATE TABLE` diverge do blueprint (não-funcional — FKs via ALTER TABLE pós-CREATE).
### 🔵 `auth_role.name`/`auth_permission.name` usam `.unique()` (nome `_unique`) em vez de `uniqueIndex` (`_idx`).

## Round 2 — fix aplicado (Claude, conduzindo) + re-validação contra o critério do DBA

Fix do 🔴 + 🔵 (uniformiza: **zero `.unique()`**, só `uniqueIndex` nomeados):
- removido `.unique()` de `email` e `tokenHash`; `auth_role.name`→`uniqueIndex('auth_role_name_idx')`;
  `auth_permission.name`→`uniqueIndex('auth_permission_name_idx')`.
- `pnpm db:generate:auth` regenerou snapshot **sem** `uniqueConstraints` (verificado); CHARSET/COLLATE re-editado.

🟡 (ordem): **aceito como está** (won't fix) — a ordem alfabética do drizzle-kit é re-emitida a cada
`db:generate`; reordenar à mão seria perdido e é não-funcional (FKs adicionadas via `ALTER TABLE` após todos os
CREATEs, validação correta). Documentado.

**Veredito round 2: APPROVED** (critério do DBA: "snapshot sem os `_unique`; SQL equivalente" — atendido).
Evidência no REPORT de re-verificação abaixo (W3 roda o gate).
