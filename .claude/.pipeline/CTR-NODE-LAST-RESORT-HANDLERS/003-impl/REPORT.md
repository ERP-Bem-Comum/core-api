# W1 — Implementação (GREEN)

## Arquivos

- **Novo:** `src/shared/runtime/last-resort.ts` — `installLastResortHandlers(shutdown, deps)` + `processLastResortDeps()`. Deps (`on`/`exit`/`write`) injetáveis; produção liga ao `process`.
- **Editado:** `src/modules/contracts/cli/main.ts` e `src/modules/financial/cli/main.ts` — após o ctx, `shutdownOnce` idempotente (guard `shuttingDown`) + `installLastResortHandlers(shutdownOnce, processLastResortDeps())`; o `finally` passa a chamar `shutdownOnce`.

## Decisões

- **Install após o ctx:** o pool MySQL só existe depois de `buildContext`; erro antes disso não tem recurso para drenar (default do Node basta). Cobre o gap real (P0) sem complexidade de ref mutável.
- **`shutdownOnce` idempotente:** `handle.close()` não é idempotente (`drivers/mysql.ts:53-55`); o guard evita double-close entre handler e `finally`.

## GREEN

helper 3/3; suíte completa verde (CA5 — E2E de CLI inalterados).

## Percalço (lint)

`promise-function-async` × `no-empty-function`/`require-await` conflitavam nas callbacks de teste; resolvido com `async` + `await Promise.resolve()` real.
