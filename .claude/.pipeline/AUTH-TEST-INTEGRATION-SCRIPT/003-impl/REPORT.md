# W1 — Implementação (GREEN) — AUTH-TEST-INTEGRATION-SCRIPT

**Skill:** pnpm-workspace-expert · **Data:** 2026-05-28 · **Estado:** GREEN

## Mudança

`package.json` — adicionado o script `test:integration:auth`, posicionado junto aos demais `test:integration:*`
(após `:storage`). Espelha o `test:integration` de contracts (precisa de MySQL + secrets), trocando os globs
pelos 4 alvos gated de auth:

```
mkdir -p secrets && printf ... > secrets/mysql_root_password.txt && ... && chmod 644 secrets/mysql_*.txt
  && docker compose up -d mysql --wait
  && MYSQL_INTEGRATION=1 node --test --test-concurrency=1 --experimental-strip-types --enable-source-maps --no-warnings
       'tests/modules/auth/adapters/persistence/refresh-token-repository.drizzle.test.ts'
       'tests/modules/auth/adapters/persistence/user-repository.drizzle.test.ts'
       'tests/modules/auth/adapters/persistence/role-repository.drizzle.test.ts'
       'tests/modules/auth/adapters/persistence/schema-hardening.test.ts'
  ; rc=$?; docker compose down -v >/dev/null; rm -f secrets/mysql_*.txt; exit $rc
```

Nenhuma mudança em `src/` — é tooling de teste. Único outro arquivo: o teste de tooling do W0.

## Verde — duas validações

### 1. Teste de config (`tests/scripts/test-integration-auth-script.test.ts`)
```
✔ CA1: o script existe e nao e vazio
✔ CA2: gate de ambiente (MYSQL_INTEGRATION=1 + --test-concurrency=1)
✔ CA3: cobre as 4 suites Drizzle/schema de auth
✔ CA4: sobe mysql via compose --wait e faz cleanup (down -v + rm secrets)
✔ package.json -> test:integration:auth  (4/4)
```

### 2. Comportamento real — `pnpm run test:integration:auth` (MySQL 8.4 via Docker)
```
RefreshTokenRepository — Drizzle/MySQL ... 8/8
RoleRepository — Drizzle/MySQL ........... 5/5
AUTH-DB-SCHEMA (CA1-CA8) ................. 8 CAs
UserRepository — Drizzle/MySQL ........... 8/8
ℹ tests 29 · suites 12 · pass 29 · fail 0 · skipped 0
Container core-api-mysql ... Removed   (cleanup do down -v executou)
```

Higiene confirmada: `git status` mostra apenas `package.json` (M) + o teste novo (??); secrets test-only removidos
pelo `rm -f` final do script (mesmo padrão do `test:integration` de contracts).

## Próximo passo
W2 (code-reviewer): audit read-only do script + teste de tooling.
