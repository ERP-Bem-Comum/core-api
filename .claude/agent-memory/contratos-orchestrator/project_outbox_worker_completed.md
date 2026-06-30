---
name: outbox-worker-completed
description: CTR-OUTBOX-WORKER ticket #5/7 fechado em 2026-05-21; lição sobre split sync/async em InMemoryOutbox
metadata:
  type: project
---

CTR-OUTBOX-WORKER (ticket #5/7 série Outbox) foi fechado em 2026-05-21 com ALL GREEN.

**Why:** Implementa `runOnce` + `runLoop` em `src/modules/contracts/worker/outbox-worker.ts`. Worker é função pura testável; CLI subcommand é ticket #6.

**Lição — `markProcessedSync` vs `markProcessed`:**
A suite contratual `outbox.contract.ts` espera `markProcessed: (eventId: string) => void` (síncrono). O worker precisa de `markProcessed(eventId, now): Promise<Result<void, OutboxQueryError>>` (assíncrono, mesma interface do Drizzle). A solução foi adicionar `markProcessedSync` ao `InMemoryOutbox` como helper exclusivo para a suite contratual, mantendo `markProcessed` async para o worker. Sempre que a InMemoryOutbox expandir a interface async de um helper, verificar se a suite contratual ainda usa a versão síncrona.

**How to apply:** Em futuras expansões de `InMemoryOutbox`, manter a regra: helpers para suites contratuais existentes permanecem síncronos com sufixo `Sync`; helpers para o worker são async e seguem a interface do Drizzle.

**Próximo ticket:** #6 — `CTR-OUTBOX-CLI-WORKER` (subcommand `run-outbox-worker`).

[[outbox-mysql-planning]]
