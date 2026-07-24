# MYSQL-TEST-PORT-HELPER — escopo (Parte B da #500)

> Size **M**. Torna a **porta do MySQL de teste configurável** por `MYSQL_PORT`, hoje fixada como
> literal `127.0.0.1:3306` em **69 arquivos** de `tests/`. Destrava rodar a integração numa porta
> alternativa **enquanto o dev segura a 3306** (coexistência) — sem parar o dev. Empilha sobre a Parte A
> (`fix/ci-runner-isolated-project`, que já isolou o projeto Docker).

## Problema (medido 2026-07-22)
- `grep -rl "127.0.0.1:3306" tests/` (fora de `tests/reports/CA-*`) → **69** arquivos fixam host:porta.
- `compose.yaml:180` **já** publica `'${MYSQL_PORT:-3306}:3306'`; `scripts/ci/test-integration.ts:43`
  **já** lê `MYSQL_PORT` — **só para o ETL** (`ETL_TEST_MYSQL_PORT`). Os demais 69 ignoram.
- Consequência: com o dev na 3306, o MySQL de teste não sobe na mesma porta → hoje é preciso **parar o
  dev**. Com a Parte A já não destrói; com a Parte B, nem precisa parar.

## Escopo (in)
1. **Helper único** `tests/support/mysql-conn.ts` (novo): deriva a conn de `MYSQL_PORT ?? '3306'` sobre
   `127.0.0.1`. Exporta o mínimo: `mysqlTestConnectionString({ user?, password?, database?, env? })`,
   `mysqlTestUrl(env?)` (= `env.MYSQL_TEST_URL ?? connectionString`, **preservando a precedência de hoje**),
   `MYSQL_TEST_HOST`/`MYSQL_TEST_DEFAULT_PORT`. Host **não** é parametrizável (fora de escopo).
2. **Migrar os 69** para o helper — substituição mecânica do literal pelo `mysqlTestConnectionString(...)`
   ou `mysqlTestUrl(...)` conforme o uso (os 2 que hoje fazem `MYSQL_TEST_URL ?? '<literal>'` → `mysqlTestUrl()`).
3. **`scripts/ci/test-integration.ts`**: passar `MYSQL_PORT` a **todas** as suites (não só ETL) e consumir
   o mesmo helper — uma fonte só para a porta.

## Fora de escopo (Parte C, com o Gabriel)
- Workflow de CI para integração MySQL (decisão local-only vs `integration-mysql.yml`).
- Parametrizar **host** (só a porta resolve a coexistência).
- Migrar fixtures de parser de config (`mysql://user:pw@mysql:3306`, `legado-host:3306` etc.) — são de
  **outro host**, não o MySQL de teste; ficam.
- Artefatos forenses em `tests/reports/CA-*` (registro histórico).

## 🚨 Caso protegido — NÃO homogeneizar
`tests/jobs/auth/sync-permissions.drizzle-mysql.test.ts` usa `AUTH_SYNC_TEST_DATABASE_URL ?? ''`
**deliberadamente sem default** — com default, um `MYSQL_INTEGRATION=1 pnpm test` apagaria o RBAC do dev
e derrubaria o acesso do admin local (o cabeçalho do arquivo explica). Este ticket **NÃO** dá default a
ele — fica na allowlist, com o motivo. O literal que o grep acha nele está **no comentário** que explica
a ausência do default.

## Critérios de aceite
- **CA1** `grep -rl "127.0.0.1:3306" tests/` retorna **0** fora da allowlist (pinada, com justificativa por entrada).
- **CA2** Sem `MYSQL_PORT`, a conn é exatamente `mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core`
  (compatibilidade retroativa — errar aqui quebra 69 arquivos).
- **CA3** Com `MYSQL_PORT=3310`, a conn aponta para 3310; o runner passa a porta ao compose (o MySQL de
  teste publica em 3310) e às suites.
- **CA4** (caminho de erro) `MYSQL_PORT` em porta sem MySQL → erro de conexão explícito (`ECONNREFUSED`),
  nunca fallback silencioso para a 3306.
- **CA5** `MYSQL_TEST_URL` mantém precedência (os 2 arquivos que a usam seguem funcionando).
- **CA6** O caso protegido (`sync-permissions`) segue **sem default** — `AUTH_SYNC_TEST_DATABASE_URL`
  ausente ⇒ os casos de banco não rodam; nenhum caminho novo alcança um banco com dados.
- **CA7** `scripts/ci/test-integration.ts` consome o helper (uma fonte só para a porta; a linha 43 do ETL
  passa a reusar o helper).
- **CA8** Regressão zero: `pnpm test` puro segue verde (os testes de integração são gated; a migração não
  muda o resultado sem `MYSQL_INTEGRATION`).

## Verificação (quando rodar)
Com a Parte A + B, `MYSQL_PORT=3310 pnpm run test:integration:financial` sobe o MySQL de teste em 3310,
ao lado do dev na 3306, roda verde, e o `down -v` (projeto isolado) não toca o dev. Destrava a prova do
épico #502 (âncoras R$55/R$5.500) **nesta máquina**, sem parar o dev.

## Pipeline
| Wave | Skill/agente | Atividade |
| :-- | :-- | :-- |
| W0 | `tdd-strategist` | RED — default 3306 (CA2), override (CA3), fonte única (CA1/CA7), caso protegido (CA6) |
| W1 | `nodejs-fs-scripter` (par `nodejs-runtime-expert`) | helper + migração dos 69 + wiring do runner |
| W2 | `code-reviewer` | audit read-only (fonte única, precedência MYSQL_TEST_URL, caso protegido intacto) |
| W3 | `ts-quality-checker` | gate |
