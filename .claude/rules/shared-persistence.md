---
paths:
  - 'src/shared/persistence/**/*.ts'
  - 'tests/shared/persistence/**/*.ts'
verify:
  - claim: 'o PoolRegistry é consumido apenas pelo worker-runner'
    root: 'src'
    pattern: 'createPoolRegistry'
    expect:
      - 'src/shared/persistence/pool-registry.ts'
      - 'src/workers/runner/run.ts'
  - claim: 'nenhum teste exercita o handle sobre pool externo (open*OnPool)'
    root: 'tests'
    pattern: 'OnPool'
    expect: []
---

A invariante `maxIdle < connectionLimit`, a dedup de pool por connection-string, a delegação dos 7 drivers e os 17 casos da guarda de boot **já são cobrados por teste** — `tests/shared/persistence/` (4 suítes) e `tests/cleanup/pool-builder-single-source.test.ts`, que exige de **todo** criador de pool a delegação ao builder, inclusive de driver ainda não escrito. Não repetir aqui. O que segue é o que nenhum deles pega.

- **O `PoolRegistry` governa um processo só: o worker-runner.** Único consumidor é `src/workers/runner/run.ts`. O `src/server.ts` usa deste diretório apenas `readModuleDriverConfigs` e repassa a `connectionString` a cada composição de módulo, que abre o **próprio** pool. Das duas curas do [Incident-0001](../../handbook/incidents/0001-prod-rds-connection-exhaustion-2026-07-10.md) só uma é global: `maxIdle < connectionLimit` alcança todo pool do repo; a **dedup não alcança a borda HTTP**. Não inferir "1 pool por URL por processo" — no `server.ts` é falso.

- **Fechar pool do registry é do `closeAll`; o handle de driver nunca fecha.** Os 4 drivers que aceitam pool externo (`open*OnPool` em `contracts`, `partners`, `financial`, `auth`) declaram `close` como `Promise.resolve()` porque não são donos. Alterar o contrato de ownership do `closeAll` quebra os quatro **em silêncio** — nenhum teste referencia `*OnPool`.
