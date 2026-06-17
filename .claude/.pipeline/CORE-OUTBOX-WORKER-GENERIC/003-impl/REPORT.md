# W1 — Implementação (CORE-OUTBOX-WORKER-GENERIC)

**Resultado:** 🟢 GREEN — extração + migração com não-regressão.

## Criado — `src/shared/outbox/`

- `types.ts` — tipos canônicos compartilhados: `OutboxRow`, `OutboxQueryError` (+constructors),
  `OutboxBatchOps`, `WorkerOutboxOps`, `WorkerConfig`, `WorkerStats`, `DeliveryError`
  (+constructors), `EventDelivery<P>` (genérico), `RowToProcessed<P>`, `SharedWorkerDeps<P>`.
- `outbox-worker.ts` — `runOnce<P>`/`runLoop<P>` genérico (claim SKIP LOCKED via `withPendingBatch`,
  delivery+marcação na mesma tx, retry/attempts, DLQ em `maxAttempts`, backoff, `AbortSignal`).
- `index.ts` — barrel.

## Migrado (sem quebrar imports)

- `contracts/application/ports/outbox.ts` e `partners/.../outbox.ts`: re-exportam os tipos de
  consumo de `#src/shared/outbox`; mantêm os específicos de append (`OutboxPort`, `OutboxAppendError`,
  `OutboxMessage`/eventos).
- `contracts/.../event-delivery.ts` e `partners/.../event-delivery.ts`: mantêm `ProcessedEvent`
  (específico); re-exportam `DeliveryError`/constructors; `EventDelivery = SharedEventDelivery<ProcessedEvent>`.
- `contracts/worker/outbox-worker.ts` (214→57) e `partners/worker/outbox-worker.ts` (213→56):
  wrappers finos que injetam `rowToProcessed` (contracts desserializa via `outboxRowToEvent`;
  partners monta da row, payload opaco) + `tag`. Assinatura `WorkerDeps`/`runOnce`/`runLoop` preservada.

## Teste de fronteira atualizado

`tests/modules/contracts/worker/outbox-consumer-port.boundary.test.ts` (INV-3/INV-5): o contrato
canônico subiu de `application/ports/` para `src/shared/outbox/` (evolução documentada como supersede
parcial de CTR-OUTBOX-CONSUMER-PORT). Invariante essencial mantido e testado: o worker depende do
contrato (shared/outbox), **nunca** de adapter; o port re-exporta; adapters não importam de `worker/`.

## Execução

```
pnpm run typecheck                 → verde
tests/shared/outbox + worker contracts + boundary → 26/26
pnpm test (suíte completa)         → 2632 pass / 0 fail / 18 skip  (sem regressão)
```

Não-regressão do worker do `partners` (sem teste unit; coberto por integração) será confirmada no
W3 via `pnpm run test:integration:partners` + `:contracts`.
