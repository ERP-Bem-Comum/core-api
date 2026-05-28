# W0 (RED) — AUTH-DB-SCHEMA

**Skill:** `tdd-strategist` · **Resultado:** RED (schema/migration auth inexistentes)

## Teste escrito

`tests/modules/auth/adapters/persistence/schema-hardening.test.ts` — **meta-teste estático** (lê o SQL da
migration `0000_*.sql` via `readdirSync`/`readFileSync` + o `schemas/mysql.ts`; regex; **sem Docker**), espelha
`tests/modules/contracts/.../schema-hardening.test.ts`. Valida o blueprint do DBA (`001-schema-blueprint.md`).

| CA | Verifica |
| :-- | :-- |
| CA1 | 6 `CREATE TABLE` com `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` |
| CA2 | ≥ 10 colunas `varchar(36)` `COLLATE utf8mb4_bin` (UUIDs) |
| CA3 | `auth_user.email` UNIQUE (`auth_user_email_idx`) |
| CA4 | `auth_refresh_token.token_hash` `CHAR(64)` UNIQUE |
| CA5 | índice composto `auth_rt_user_revoked_idx` (`user_id`, `revoked_at`) |
| CA6 | CHECKs `auth_user_status_chk`, `auth_user_disabled_consistency_chk`, `auth_rt_expiry_chk` |
| CA7 | **nenhuma** FK `ON DELETE CASCADE`; FKs nomeadas presentes |
| CA8 | `schemas/mysql.ts` declara os 6 `mysqlTable` auth_* |

## Saída RED

```
ℹ tests 8 · pass 0 · fail 8
✖ CA1..CA8 — migration 0000_*.sql ausente / schema.ts ausente
```

## Handoff para W1b (`drizzle-orm-expert`)

Traduzir o `001-schema-blueprint.md` para `src/modules/auth/adapters/persistence/schemas/mysql.ts` (6 `mysqlTable`),
`drizzle.config` auth + `db:generate`, editar o SQL para CHARSET/COLLATE manual (notas 1–9 do blueprint). O teste
estrutural acima passa a GREEN. Teste de integração `INFORMATION_SCHEMA` (Docker) entra no W3.
