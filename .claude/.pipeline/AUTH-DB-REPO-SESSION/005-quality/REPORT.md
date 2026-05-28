# Quality Check (W3) — AUTH-DB-REPO-SESSION

**Skill:** ts-quality-checker · **Data:** 2026-05-28 · **Veredito final:** ✅ ALL GREEN

| # | Check | Status | Detalhes |
| :- | :--- | :--- | :--- |
| 1 | Type check (`pnpm run typecheck` → `tsc --noEmit`) | ✅ | limpo (exit 0) |
| 2 | Format (`pnpm run format:check` → `prettier --check .`) | ✅ | "All matched files use Prettier code style!" |
| 3 | Lint (`pnpm run lint` → `eslint .`) | ✅ | sem problemas (exit 0) |
| 4 | Testes unit (`pnpm test`) | ✅ | 1387 pass · 0 fail · 16 skipped (integração gated) |
| 5 | **Integração Drizzle auth vs MySQL 8.4 real** (Docker) | ✅ | 29/29 — refresh-token **8/8** + vizinhos |
| 6 | Build | ⏭️ SKIPPED (Fase 1 — roda via `--experimental-strip-types`) | — |

---

## Check 5 — Integração (Docker `compose up mysql --wait`, `MYSQL_INTEGRATION=1`, `--test-concurrency=1`)

O script `package.json#test:integration` cobre apenas globs do módulo **contracts** — não inclui `auth`. Replicado
o mesmo setup (secrets test-only → `docker compose up -d mysql --wait` → suites gated → `down -v` + `rm secrets`),
mesmo padrão dos precedentes AUTH-DB-REPO-USER e AUTH-DB-REPO-ROLE. Boot único do MySQL rodou as 4 suites Drizzle
de auth (foco: refresh-token; user/role/schema-hardening como rede de regressão).

**Foco do ticket — `RefreshTokenRepository contract — Drizzle/MySQL` (8/8):**

```
✔ CA1: save -> findById retorna o token
✔ CA2: findById inexistente retorna ok(null)
✔ CA3: save -> findByTokenHash retorna o token
✔ CA4: findByTokenHash inexistente retorna ok(null)
✔ CA5: save de mesmo id faz upsert (revogacao refletida)
✔ A6a/CA5: findRevocableByUserId sem tokens do usuario retorna []
✔ A6a/CA6: findRevocableByUserId retorna apenas tokens do userId informado
✔ A6a/CA7: inclui active/expired/rotated (revokedAt === null); exclui revoked
```

Validado contra MySQL real: o `save` transacional (SELECT-FOR-UPDATE → UPDATE só `revokedAt`/`replacedBy` ou INSERT,
sem ODKU — ADR-0020), o `findByTokenHash` pelo índice UNIQUE `auth_rt_token_hash_idx`, o `findRevocableByUserId` pelo
índice composto `auth_rt_user_revoked_idx` (`WHERE user_id=? AND revoked_at IS NULL`), e a FK `auth_rt_user_fk`
RESTRICT (resolvida via `seedUser` idempotente). Migration auth aplicada por `openAuthMysql({ applyMigrations: true })`.

**Regressão de vizinhança (mesmo boot):**

```
RoleRepository — Drizzle/MySQL ................. 5/5 (inclui CA6 reconciliacao permission por name)
AUTH-DB-SCHEMA (CA1-CA8) ....................... 8 CAs (ENGINE/charset, utf8mb4_bin, UNIQUE, CHECK, FK RESTRICT)
UserRepository — Drizzle/MySQL ................. 8/8 (CA1-CA6 + CA8 reidratacao roles/permissions + CA9 FK)

ℹ tests 29 · suites 12 · pass 29 · fail 0 · skipped 0 · duration_ms 2108
```

> Nota: o log `[user-repo:save] Error: ... insert into auth_user_role ...` é o erro de FK **esperado** do CA9
> (`roleId` inexistente → violação `auth_urt_role_fk` convertida em `Result`); o teste passou.

Container `down -v` e secrets `mysql_*.txt` removidos ao fim (cleanup confirmado mesmo fora de falha).

---

## Nota de processo (reconciliação do W2)

O W2 foi conduzido pelo subagente do W1 (`mysql-database-expert`), que escreveu `004-code-review/REVIEW.md`
(veredito APPROVED, round 1) **sem registrar** `wave-finish W2` no `STATE.json` — a wave ficou `pending` no estado
canônico apesar do REVIEW no disco. Reconciliado pelo orquestrador antes do W3: `wave-start W2 --agent code-reviewer`
→ `wave-finish W2 --outcome APPROVED --report 004-code-review/REVIEW.md`. Reforço já registrado no próprio
REVIEW.md:21-25 — o controle de pipeline state é do orquestrador, não do subagente de implementação.

---

## Próximo passo

- **ALL GREEN** → AUTH-DB-REPO-SESSION fecha (P3). `RefreshTokenRepository` + `refresh-token.mapper` Drizzle entregues
  (save SELECT-FOR-UPDATE, findByTokenHash UNIQUE, findRevocableByUserId índice composto; sem Clock — o token carrega
  seus instantes). Os 3 repos auth (User/Role/RefreshToken) agora têm adapter Drizzle validado contra MySQL real.
- **Destrava P4** (wiring composition root / CLI driver `mysql` para auth) — fora de escopo deste ticket.
- **Dívida de tooling anotada (não-bloqueante):** `package.json#test:integration` ainda não inclui os globs de
  `tests/modules/auth/**` — a integração auth depende de invocação manual. Candidato a ticket próprio
  (ex.: `AUTH-CI-INTEGRATION-GLOB`) para o CI cobrir auth automaticamente.
