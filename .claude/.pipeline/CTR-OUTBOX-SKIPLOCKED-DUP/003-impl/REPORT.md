# W1 — implementação mínima até GREEN

> Outcome: **GREEN** — `CA-I2` estável 3× contra MySQL real. Abordagem B (claim + delivery
> + marcação na mesma transação) confirmada em W0.

## Correção

O `FOR UPDATE SKIP LOCKED` só isola workers concorrentes se o lock sobreviver até a
marcação. Em autocommit (`findPendingForUpdate` em statement isolado) o lock é liberado
ao fim do `SELECT`, e o 2º worker relê as mesmas rows (`processed_at IS NULL`).

Nova operação canônica de consumo: **`withPendingBatch(limit, handler)`** — abre uma
`db.transaction`, trava até `limit` rows pendentes com `FOR UPDATE SKIP LOCKED`, e invoca
o handler com as rows + `OutboxBatchOps` (marcação) ligadas à **mesma tx**. O COMMIT
ocorre ao fim do handler, depois de delivery + marcação. O lock sobrevive até lá → o 2º
worker pula as rows travadas. At-least-once preservado (ADR-0015).

## Arquivos tocados

- `worker/outbox-worker.ts` — novo tipo `OutboxBatchOps`; `WorkerOutboxOps` ganha
  `withPendingBatch`; `runOnce` reescrito para rodar o batch inteiro dentro de
  `withPendingBatch` (marcação via `ops.*`, não mais `deps.outbox.*` direto).
- `adapters/persistence/repos/outbox-repository.drizzle.ts` — implementa `withPendingBatch`
  com `db.transaction` + `.for('update', { skipLocked: true })`; ops de marcação usam a `tx`.
- `adapters/outbox/outbox.in-memory.ts` — espelha a semântica (single-threaded: lock
  implícito); ops reaproveitam `markProcessed`/`markFailed`/`moveToDeadLetter`.
- `cli/drivers/memory.ts` e `cli/drivers/mysql.ts` — expõem `withPendingBatch` no
  `WorkerOutboxOps` do `CliContext`.

Os 4 helpers diretos (`findPendingForUpdate`/`markProcessed`/...) permanecem para
inspeção e testes de unidade — **não** para consumo concorrente.

## Validação

- `pnpm run typecheck` → verde.
- Suíte `outbox-worker.integration.test.ts` (MySQL real): CA-I1, CA-I2, CA-I3 verdes.
- `CA-I2` rodado 3× seguidas na mesma instância → verde estável (≈11-12ms cada).

## Nota fora de escopo

`pnpm test` acusa `CA-5: readonly_bi consegue SELECT` (`tests/infra/mysql-compose.test.ts`)
vermelho. É a falha pré-existente já catalogada em `CTR-INFRA-READONLY-BI-GRANT` (login
`Access denied` do user `readonly_bi`), sem relação com outbox. Não introduzida por este ticket.
