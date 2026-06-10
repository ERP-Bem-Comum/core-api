# 004 — W2 (code-review) — CLI-RETIRE-EMBEDDED

Audit read-only por `nodejs-runtime-expert` focado no único código novo: o entrypoint standalone do
worker de outbox (`worker/run.ts` + `config.ts`). A deleção da CLI é mecânica e provada verde
(typecheck/lint/test 2552-0 + integração 79/79 + smoke do server.ts). 2 rounds.

## Veredito final: **APPROVED** (round 2, após fixes)

## Round 1 — REJECTED (worker como daemon de produção)

- **BLOCKER-1** (`run.ts` catch fatal): `String(cause)` descartava o stack trace — anti-padrão já
  documentado em memória do projeto (`feedback_last_resort_stack_trace`). Crítico p/ diagnosticar
  crash de daemon.
- **MAJOR-1** (top-level `await main()` sem `.catch()`): um reject inesperado de `main()` viraria
  `unhandledRejection`, encerrando sem fechar o pool mysql2 (keepAlive).
- MINOR: logs operacionais no stdout (daemon → stderr); comentário sobre `process.once` auto-remover
  listeners; valor da env inválida no log.
- **Confirmações positivas**: `finally → handle.close()` fecha o pool em todos os caminhos válidos;
  `process.exitCode` (não `process.exit()`) correto; top-level await válido em NodeNext; `applyMigrations:
  false` correto (worker é consumidor; tabela ausente → retry loop, não crash); exit 78 (EX_CONFIG)
  apropriado; concorrência segura (FOR UPDATE SKIP LOCKED no withPendingBatch, não tocado).

## Fix (round 2)
- `run.ts` catch fatal + novo `.catch()` do top-level: preservam stack (`cause instanceof Error ?
  cause.stack ?? cause.message : String(cause)`) e fecham o caminho de unhandledRejection.
- Logs de boot/shutdown movidos para **stderr** (convenção de daemon).
- Comentário esclarecendo a remoção de listeners no `finally`.
- MINOR-3 (logar `process.env`) **descartado** — risco de vazar connection string; o código de erro já
  nomeia a var.

## Verificação (round 2)
- typecheck ✓ · format ✓ · lint ✓ · `pnpm test` **2535 / 0 fail**.
- Smoke do worker sem env: exit **78** (EX_CONFIG) + erro no stderr.

Promove para W3.
