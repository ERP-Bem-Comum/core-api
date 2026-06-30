# 003 — W1 (impl) — CLI-RETIRE-EMBEDDED

CLI embutida arrancada; worker do outbox extraído; Docker repontado para HTTP.

## Novo código (worker standalone)
- `src/modules/contracts/worker/config.ts` — `readWorkerConfig(env)` puro (CONTRACTS_DATABASE_URL +
  OUTBOX_*), `Result<WorkerRuntimeConfig, WorkerConfigError>`.
- `src/modules/contracts/worker/run.ts` — entrypoint: openMysql (applyMigrations:false) +
  createDrizzleOutboxRepository + ClockReal + LoggerEventDelivery → runLoop; SIGTERM/SIGINT →
  AbortController; finally fecha o pool. **Zero import de `cli/`**.
- `tests/modules/contracts/worker/run-config.test.ts` — 4 casos (substitui a cobertura do antigo
  comando CLI run-outbox-worker).
- `package.json`: `worker:outbox` (substitui `cli:contracts`/`cli:financial`); `test:integration` sem
  o teste CLI mysql.

## Docker / deploy
- `Dockerfile`: `ENTRYPOINT` CLI → `node src/server.ts` (HTTP, ADR-0037); CMD removido.
- `compose.yaml`: serviço `app` sem `command` override (usa entrypoint HTTP).

## Removido (git rm)
- `src/modules/contracts/cli/` + `src/modules/financial/cli/` (dirs).
- `tests/cli/` + `tests/modules/contracts/cli/` + `tests/modules/financial/cli/`.
- `tests/regression/reports-2026-05-15.test.ts` (regressão 100% CLI: loadState + runCli).
- `drizzle-mysql.test.ts`: removido bloco CA-13/14 (testava `buildMysqlContext` da CLI) + import.

## Ajustes (refs a arquivos deletados)
- `no-throw-in-exhaustive-default.test.ts`: `WATCHED_FILES` sem `cli/formatters/period.ts`.
- `sqlite-removal.test.ts` CA-14: de "conteúdo de parse-driver-flags" → "arquivo removido com a CLI".
- `AGENTS.md` (comandos + skill table + `.worktreeinclude` desc), `.worktreeinclude` (cli-state.json),
  `.claude/rules/adapters.md` (driver por env, não flag; remove path `cli/`; remove skill cli-builder),
  `handbook/CHANGELOG.md`.

## Invariante (ADR-0037 §5): domínio/application/persistência/HTTP **intactos**. Sem reverse-deps de cli/.

## Resultado
- typecheck ✓ · format:check ✓ · lint ✓.
- `pnpm test`: **2535 pass / 0 fail / 17 skipped** (2552; ~150 testes de CLI removidos).
- `pnpm run test:integration`: **79/79** (worker CA-I1/I2 intactos; queda 91→79 = cli mysql + CA-13/14).
- Smoke do novo entrypoint: `node src/server.ts` sobe, serve HTTP (404 em `/`), encerra limpo no SIGTERM.

Pendência (doc, não-bloqueante): refs à CLI em `.claude/skills/*` (application-cli-builder, exemplos em
nodejs-*/ports-and-adapters) — follow-up de higiene de doc. Próximo: W2.
