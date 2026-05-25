W2 REVIEW - CTR-OUTBOX-CLI-WORKER - APPROVED - Round 1 - 2026-05-21

Arquivos auditados:
  src/modules/contracts/worker/outbox-worker.ts
  src/modules/contracts/cli/context.ts
  src/modules/contracts/cli/drivers/memory.ts
  src/modules/contracts/cli/drivers/mysql.ts
  src/modules/contracts/cli/commands/run-outbox-worker.ts
  src/modules/contracts/cli/registry.ts
  tests/modules/contracts/cli/commands/run-outbox-worker.test.ts

Resultado: APPROVED

Checks:
  sem throw no command (catch -> return 1) OK
  sem class/this OK
  sem any OK
  retorno explicito em run: Promise<number> OK
  import type correto OK
  extensoes .ts nos imports OK
  AbortController + SIGTERM cancela cleanly OK
  process.off no finally (sem leak de listeners) OK
  outboxCleanup chamado no finally OK
  driver memory rejeita antes de parseFlags OK
  --help antes da validacao de driver OK
  exactOptionalPropertyTypes: outboxCleanup omitido (nao undefined explicito) OK
  WorkerOutboxOps exported, WorkerDeps.outbox refatorado OK
  4 testes com AAA explícito OK
