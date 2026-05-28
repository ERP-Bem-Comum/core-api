# Quality Check (W3) — AUTH-DB-REPO-USER

**Skill:** ts-quality-checker · **Data:** 2026-05-27 · **Veredito final:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`tsc --noEmit`) | ✅ | limpo |
| 2 | Format (`prettier --check .`) | ✅ | limpo |
| 3 | Lint (`eslint .`) | ✅ | sem problemas |
| 4 | Testes (`pnpm test`) | ✅ | 1419 pass · 0 fail · 16 skipped (integração gated) |
| 5 | **Integração Drizzle User vs MySQL 8.4 real** (Docker) | ✅ | 8/8 — ver abaixo |

## Integração (Docker compose mysql:8.4, `MYSQL_INTEGRATION=1`)

`openAuthMysql({ applyMigrations: true })` aplicou a migration auth e rodou `user-repository.drizzle.test.ts`:

```
UserRepository contract — Drizzle/MySQL:
  ✔ CA1 save→findById   ✔ CA2 findById null   ✔ CA3 save→findByEmail
  ✔ CA4 findByEmail null ✔ CA5 upsert status   ✔ CA6 e-mail duplicado → email-already-registered
CA8 ✔ findById reidrata roles[] com permissions[] (3 JOINs reais)
CA9 ✔ save com roleId inexistente → erro (FK auth_urt_role_fk RESTRICT)
ℹ tests 8 · pass 8 · fail 0
```

Validado contra MySQL real: a transação do `save` (SELECT FOR UPDATE + upsert + replace `auth_user_role`), o
`isEmailDupEntry` contra o `ER_DUP_ENTRY` (1062) real do índice `auth_user_email_idx`, a reidratação de
`roles[]`/`permissions[]` pelos 3 JOINs, e a FK `RESTRICT`. Container `down -v` e secrets removidos ao fim.

## Validação cruzada (resumo)
W2 APPROVED round 1 (código fiel ao blueprint). 🟡 registrado: duplicação Q2/Q3 entre `findById`/`findByEmail`
(refactor de manutenção — extrair `hydrateUser`); não-bloqueante.

## Próximo passo
- **ALL GREEN** → P1 fecha. `UserRepository`/`UserReader` Drizzle entregues (save transacional, reidratação de
  roles, `email-already-registered`). Destrava **P2** (`RoleRepository` Drizzle + mapper: `permissions[]` via
  `auth_role_permission`→`auth_permission`) e **P3** (`RefreshTokenRepository` Drizzle).
- **Refactor opcional anotado:** extrair `hydrateUser(userRow)` em `user-repository.drizzle.ts` (DRY Q2/Q3).
