# W1 (GREEN) — AUTH-DB-SCHEMA — em duas mãos

## W1a — DBA (`mysql-database-expert`)

Blueprint DDL em `001-schema-blueprint.md` (resolveu as 4 decisões com citação refman/ADR/best-practices).

## W1b — Implementador (`drizzle-orm-expert`)

Traduziu o blueprint para Drizzle + migration. Arquivos:

| Arquivo | Ação |
| :-- | :-- |
| `src/modules/auth/adapters/persistence/schemas/mysql.ts` | 6 `mysqlTable` (ordem de criação do blueprint) + `$infer*` |
| `.../migrations/mysql/0000_flowery_demogoblin.sql` | `db:generate:auth` + edição manual CHARSET/COLLATE |
| `.../migrations/mysql/meta/{_journal,0000_snapshot}.json` | gerados |
| `drizzle.config.auth.ts` | config isolado (schema→auth, out→migrations auth) |
| `package.json` | + script `db:generate:auth` |
| `tsconfig.json` | + `drizzle.config.auth.ts` no `include` |

### Migration emitida (conferida contra o blueprint)

- 6 `CREATE TABLE` com `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`.
- UUIDs `varchar(36) COLLATE utf8mb4_bin`; `token_hash char(64) bin`; `auth_permission.name varchar(128) bin`.
- `auth_user_email_idx` UNIQUE; `auth_rt_token_hash_idx` UNIQUE; índice composto `auth_rt_user_revoked_idx (user_id, revoked_at)`; FK indexes `auth_rp_permission_idx`, `auth_urt_role_idx`.
- CHECKs: `auth_user_status_chk`, `auth_user_disabled_consistency_chk` (bicondicional), `auth_permission_name_format_chk` (REGEXP_LIKE), `auth_role_name_nonempty_chk`, `auth_rt_expiry_chk`, `auth_rt_hash_nonempty_chk`.
- 5 FKs `ON DELETE restrict ON UPDATE restrict` nomeadas (adicionadas via `ALTER TABLE` após os CREATEs — ordem de FK resolvida). `replaced_by` sem FK (Decisão 4).

### Desvio reportado pelo implementador (para o DBA validar no W2)

O drizzle-kit gerou constraints UNIQUE duplicadas (`.unique()` + `uniqueIndex()`) para `email` e `token_hash`;
o SQL foi editado para manter só o índice nomeado canônico (`auth_user_email_idx`/`auth_rt_token_hash_idx`).
**W2 deve verificar:** o `schema.ts` declara só uma fonte de unicidade (senão o `0000_snapshot.json` diverge do
SQL editado → drift no próximo `db:generate:auth`).

## Verificação

```
schema-hardening.test.ts (W0 estrutural): tests 8 · pass 8 · fail 0
tsc --noEmit / eslint / prettier --check: limpos
```

## Handoff para W2 (validação cruzada)

- **DBA** (`mysql-database-expert`): valida a migration emitida vs. `001-schema-blueprint.md` + ADR-0020; checar
  o ponto do snapshot vs SQL editado (drift de unicidade).
- **`code-reviewer`**: audita `schemas/mysql.ts` (aderência ao padrão, isolamento `auth_*`, tipos canônicos).
