# W3 — gate de qualidade — MYSQL-TEST-PORT-HELPER (Parte B da #500)

| Gate | Comando | Resultado |
| :-- | :-- | :-- |
| typecheck | `pnpm run typecheck` | ✅ `tsc --noEmit` limpo |
| lint | `pnpm run lint` | ✅ `eslint .` sem erros |
| format | `pnpm run format:check` | ✅ All matched files use Prettier code style |
| test | `pnpm test` | ✅ 4362 tests · 4343 pass · **0 fail** · 19 skip (integração gated) |

## Critérios de aceite
- **CA1** `grep -rl "127.0.0.1:3306" tests/` fora de `reports/CA-*` → só a allowlist documentada:
  `tests/support/mysql-conn.ts` (o helper), `tests/support/mysql-conn.test.ts` (literal congelado do CA2),
  `tests/cleanup/mysql-test-port-single-source.test.ts` (teste estrutural que busca ofensores),
  `tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts` (caso protegido, sem default). 0 ofensores reais. ✅
- **CA2** Sem `MYSQL_PORT`, conn = `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core` (14 casos W0). ✅
- **CA5** `MYSQL_TEST_URL` mantém precedência (`mysqlTestUrl`). ✅
- **CA6** Caso protegido `sync-permissions` segue **sem default** (`AUTH_SYNC_TEST_DATABASE_URL`, 2 refs no
  arquivo, ambas no comentário/uso deliberado). ✅
- **CA7** `scripts/ci/test-integration.ts` consome o helper (`mysqlTestConnectionString`). ✅
- **CA8** Regressão zero — `pnpm test` puro verde; integração segue gated por `MYSQL_INTEGRATION`. ✅

## Verificação de integração (pendente por #500, Parte C com Gabriel)
`MYSQL_PORT=3310 pnpm run test:integration:financial` — sobe o MySQL de teste em 3310 ao lado do dev na
3306, roda a âncora R$5.500 verde, `down -v` isolado não toca o dev. **Não executada nesta máquina** (a
Parte C — workflow de CI + decisão local — fica com o Gabriel; a #500 rastreia).
