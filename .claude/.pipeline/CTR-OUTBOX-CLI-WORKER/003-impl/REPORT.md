W1 REPORT - CTR-OUTBOX-CLI-WORKER - GREEN - 2026-05-21

Tests: 681 / 668 pass / 0 fail / 13 skipped. Typecheck: zero errors.

Arquivos criados/editados:
  src/modules/contracts/worker/outbox-worker.ts: exporta WorkerOutboxOps
  src/modules/contracts/cli/context.ts: adiciona driver, outbox, outboxCleanup
  src/modules/contracts/cli/drivers/memory.ts: adiciona driver + outbox merged
  src/modules/contracts/cli/drivers/mysql.ts: adiciona driver + outbox Drizzle repo
  src/modules/contracts/cli/commands/run-outbox-worker.ts: NOVO subcomando
  src/modules/contracts/cli/registry.ts: registra run-outbox-worker

Decisoes de design:
  WorkerOutboxOps exportado de outbox-worker.ts para CliContext referenciar
  outbox no context = { append, findPendingForUpdate, markProcessed, markFailed, moveToDeadLetter }
  --test-abort flag pre-aborta AbortController (determinismo CA-T3)
  outboxCleanup omitido (nao assigned undefined) por exactOptionalPropertyTypes
  Pool compartilhado nos dois drivers - shutdown() do handle fecha tudo
