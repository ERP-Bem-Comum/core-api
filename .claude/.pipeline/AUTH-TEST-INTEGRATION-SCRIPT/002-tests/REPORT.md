# W0 — Testes (RED) — AUTH-TEST-INTEGRATION-SCRIPT

**Skill:** tdd-strategist · **Data:** 2026-05-28 · **Estado:** RED

`tests/scripts/test-integration-auth-script.test.ts` — 4 casos (CA1-CA4) que leem `package.json` via
`node:fs` e validam a forma do runner `test:integration:auth`.

## Resultado RED

```
✖ CA1: o script existe e nao e vazio        → AssertionError: scripts["test:integration:auth"] ausente
✖ CA2: gate de ambiente                      → actual: '', expected /MYSQL_INTEGRATION=1/
✖ CA3: cobre as 4 suites Drizzle/schema      → actual: '', expected /refresh-token-repository\.drizzle/
✖ CA4: sobe mysql + cleanup                  → actual: '', expected /docker compose up -d mysql --wait/
```

Falha por inexistência do script `test:integration:auth` no `package.json` (`script = '' ` no fallback
`?? ''`). Fail-first satisfeito — o teste só passa quando o script for adicionado no W1.

## Cobertura

| CA | Asserção |
| --- | --- |
| CA1 | `scripts['test:integration:auth']` é string não-vazia |
| CA2 | contém `MYSQL_INTEGRATION=1` **e** `--test-concurrency=1` |
| CA3 | referencia as 4 suites: `refresh-token-repository.drizzle`, `user-repository.drizzle`, `role-repository.drizzle`, `schema-hardening` |
| CA4 | `docker compose up -d mysql --wait` + cleanup (`docker compose down -v` e `rm -f secrets/mysql_*.txt`) |

## Próximo passo

W1: adicionar o script `test:integration:auth` ao `package.json` (espelhando `test:integration`) → GREEN.
Validar comportamento real rodando `pnpm run test:integration:auth` contra MySQL 8.4.
