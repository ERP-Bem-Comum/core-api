# Quality Check (W3) — AUTH-DB-SCHEMA

**Skill:** ts-quality-checker · **Data:** 2026-05-27 · **Veredito final:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`tsc --noEmit`) | ✅ | exit 0 |
| 2 | Format (`prettier --check .`) | ✅ | clean (meta JSONs do drizzle-kit formatados) |
| 3 | Lint (`eslint .`) | ✅ | sem problemas |
| 4 | Testes (`pnpm test` — suíte completa) | ✅ | tests 1417 · pass 1401 · fail 0 · skipped 16 (gated integração) |
| 5 | **Integração — migration vs MySQL 8.4 real** (Docker) | ✅ | ver abaixo |

## Integração (Docker compose mysql:8.4)

Subiu o MySQL 8.4 do compose (`--wait` → Healthy), aplicou `0000_charming_mastermind.sql` e validou via
`INFORMATION_SCHEMA`:

```
aplicando migration auth no database core -> APLICADA SEM ERRO
tabelas auth_*: auth_permission, auth_refresh_token, auth_role, auth_role_permission, auth_user, auth_user_role  (6)
CHECK_CONSTRAINTS auth_*: 6
REFERENTIAL_CONSTRAINTS DELETE_RULE: RESTRICT (todas)
```

Confirma que MySQL 8.4 aceita: `REGEXP_LIKE` em CHECK, o CHECK bicondicional `(status='disabled')=(disabled_at IS NOT NULL)`,
`CHAR(64)`, collations `utf8mb4_bin`/`utf8mb4_unicode_ci`, e as 5 FKs `ON DELETE/UPDATE RESTRICT`. Container
derrubado (`down -v`) e secrets removidos ao fim.

## Nota de processo (validação cruzada funcionou)

W2 round 1 foi **REJECTED** pelo DBA (drift snapshot↔SQL: `.unique()` + `uniqueIndex()` duplicados em
`email`/`token_hash`). Fix no round 2: removidos todos os `.unique()` (só `uniqueIndex` nomeados), regenerada a
migration (`0000_charming_mastermind.sql`) com snapshot limpo (zero `uniqueConstraints`). 🟡 ordem das tabelas
aceita (alfabética do drizzle; FKs via ALTER TABLE pós-CREATE — não-funcional).

## Próximo passo

- **ALL GREEN** → P0 fecha. Schema `auth_*` modelado (DBA) + implementado (Drizzle) + validado (cruzado + MySQL real).
  Destrava **P1** (UserRepository+UserReader Drizzle + mapper, roles via JOIN, UNIQUE email → `email-already-registered`).
- **Pendência registrada para P1+:** estender `test:integration` (lista de arquivos) com um teste de integração auth
  via mysql2/migrator quando o driver auth for wired (os contract-suites Drizzle dos repos exercitarão o schema).
