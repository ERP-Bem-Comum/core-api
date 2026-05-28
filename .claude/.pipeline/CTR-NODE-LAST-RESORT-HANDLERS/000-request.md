# CTR-NODE-LAST-RESORT-HANDLERS — Handlers de último recurso nos entrypoints

## Origem

Auditoria de boas práticas (sessão 2026-05-26), gap Node #3 (P0). Os dois `main.ts`
(`contracts/cli/main.ts`, `financial/cli/main.ts`) só tratam a rejeição da própria
`Promise` de `main()` via `.then(onOk, onErr)`. Um erro **fora da cadeia de promise**
— throw síncrono num callback do `mysql2`, num `EventEmitter`, num `setImmediate` —
não é capturado: o Node encerra com exit 1 **sem** `ctx.shutdown()`, abandonando o
pool MySQL aberto até o `wait_timeout`.

Ref: `handbook/reference/nodejs/Process.md` (`uncaughtException`/`unhandledRejection`).

## Escopo

1. **Helper** `src/shared/runtime/last-resort.ts` (shared kernel, deps injetáveis para teste):
   - `installLastResortHandlers(shutdown, deps)` — registra `uncaughtException` e
     `unhandledRejection`; em fatal: loga em stderr, roda `shutdown` (best-effort) e sai com 1.
   - `processLastResortDeps()` — liga `on`/`exit`/`write` ao `process` real.
2. **Wiring** em ambos os `main.ts`: após `buildContext`, instala os handlers com um
   `shutdownOnce` idempotente (o pool só existe após o ctx; `handle.close()` não é
   idempotente → guard evita double-close entre handler e `finally`).

## Critérios de aceitação

- CA1: `installLastResortHandlers` registra listener para `uncaughtException` e `unhandledRejection`.
- CA2: em fatal, escreve mensagem citando o tipo do erro em stderr, chama `shutdown` e sai com código 1.
- CA3: `exit(1)` ocorre **depois** de `shutdown` resolver (drena antes de sair).
- CA4: ambos os `main.ts` instalam os handlers após o ctx, com `shutdownOnce` idempotente.
- CA5: a suíte existente (CLI E2E inclusa) segue verde — caminho normal inalterado.

## Fora de escopo (YAGNI)

- Handler de `SIGTERM`/`SIGINT` na CLI (o outbox worker já tem; ver `run-outbox-worker.ts`).
- Cobertura de erro **antes** do ctx (sem pool → comportamento default do Node basta).
