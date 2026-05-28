# Quality Check (W3) — AUTH-DB-REPO-ROLE

**Skill:** ts-quality-checker · **Data:** 2026-05-27 · **Veredito final:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check | ✅ | limpo |
| 2 | Format | ✅ | limpo |
| 3 | Lint | ✅ | sem problemas |
| 4 | Testes (`pnpm test`) | ✅ | 1404 pass · 0 fail · 16 skipped (gated) |
| 5 | **Integração Drizzle Role vs MySQL 8.4 real** | ✅ | 5/5 |

## Integração (Docker mysql:8.4, `MYSQL_INTEGRATION=1`)

```
RoleRepository contract — Drizzle/MySQL:
  ✔ CA1 save→findById  ✔ CA2 findById null  ✔ CA3 upsert (permission +1)  ✔ CA4 list
CA6 ✔ dois roles, mesma permission → auth_permission criada UMA vez (upsert idempotente por name)
ℹ tests 5 · pass 5 · fail 0
```

Validado contra MySQL real: o upsert de `auth_role`, a **reconciliação `auth_permission` por name com
ignore-then-reselect** (CA6 confirma idempotência — uma linha por permission compartilhada), o replace de
`auth_role_permission` e a reidratação de `permissions[]` (findById + list sem N+1). Container `down -v` + secrets removidos.

## Próximo passo
- **ALL GREEN** → P2 fecha. `RoleRepository` Drizzle entregue. Falta **P3** (`RefreshTokenRepository` Drizzle —
  findByTokenHash, findRevocableByUserId, save) e **P4** (wiring composition root / CLI driver mysql auth).
