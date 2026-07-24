# MYSQL-TEST-PORT-HELPER — W1 (GREEN)

> Parte B da #500 · 2026-07-22. **O subagente do W1 morreu sem produzir nada (154 bytes de output, 0 no
> disco); a P.O. autorizou reiniciar, e o orquestrador principal fez a migração diretamente** — mais
> confiável para um bulk mecânico, com verificação a cada passo.

## Arquivos
- **Novo** `tests/support/mysql-conn.ts` — o helper (assinatura exata do W0). Passa os 14 testes comportamentais.
- **`package.json`** — subpath `#tests/*: ./tests/*` (como `#src/*`), para import fixo nos 68 (sem relativo por arquivo).
- **68 arquivos de `tests/` migrados** — literal `127.0.0.1:3306` → helper. Distribuição: 64 literal dominante → `mysqlTestConnectionString()`; 9 variantes de credencial → `mysqlTestConnectionString({ user, password[, database] })`; 2 `MYSQL_TEST_URL ?? '<literal>'` → `mysqlTestUrl()`. Migração por script determinístico (nenhum "SEM MATCH").
- **`scripts/ci/test-integration.ts`** — consome o helper (`ETL_DB_ENV` usa `mysqlTestConnectionString({ database })`); removida a derivação `MYSQL_PORT ?? '3306'` e a conn inline (CA7).
- **`tests/support/mysql-conn.test.ts`** — 1 edição de lint declarada: `String(MYSQL_TEST_DEFAULT_PORT)` → `MYSQL_TEST_DEFAULT_PORT` (a constante virou `string` tipada; `String()` redundante — `no-unnecessary-type-conversion`). Asserção idêntica, mais forte.

## Prova (verificada no fio principal)
- **Offenders fora da allowlist = 0** (CA1). Protegido `sync-permissions` **intocado** — segue `?? ''` sem default (CA6).
- Helper: 14/14. Estrutural (CA1/CA6/CA7): verde. `mysql-conn.test.ts` (CA2 congelado, CA3, CA4, endurecimento, overrides, CA5): verde.
- `pnpm test`: **pass 4339 · fail 0 · skipped 19**. `typecheck` · `lint` · `format:check` verdes.
- Integração **não executada** (a prova real `MYSQL_PORT=3310 pnpm run test:integration:*` é W3/manual).

## CA4 (sem fallback à 3306)
`MYSQL_PORT=3310` → conn `:3310`, **nunca** contém `3306` (guarda de porta vazia inclusa). O `ECONNREFUSED`
real é W3/integração.

## Notas para o W2
- **Bulk feito por script determinístico** — auditar amostras: literal dominante, uma variante de cada (`core:pw`, `core_app:*`, `invalid:invalid/inexistente`, `user:pw`), e os 2 de `MYSQL_TEST_URL`.
- **`#tests/*` novo** no package.json — resolve em runtime (Node subpath) e tsc (NodeNext); o runner (`scripts/`) importa `#tests/support/mysql-conn.ts` — confirmar que resolve fora de `tests/`.
- **Runner passa `MYSQL_PORT` às suites e ao compose** por herança de `process.env` (spawnSync sem override de env no compose; spread no node --test) — não precisou wiring extra.
- Caso protegido: confirmar que nenhum caminho novo alcança um banco com dados.

## Próximo passo
W2 (REVIEW) — `code-reviewer`.
