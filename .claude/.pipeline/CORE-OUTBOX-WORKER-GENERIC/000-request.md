# CORE-OUTBOX-WORKER-GENERIC — Worker de outbox genérico compartilhado

## Contexto

Os workers `contracts/worker/outbox-worker.ts` e `partners/worker/outbox-worker.ts` são
**~90% código idêntico** (`sleep`, `workerTag`, `runOnce`, `runLoop`, `WorkerConfig`,
`WorkerStats`). Os ports de consumo (`WorkerOutboxOps`, `OutboxRow`, `OutboxBatchOps`,
`OutboxQueryError`) são **estruturalmente idênticos** entre os dois módulos. `financial`
(feature 014) e `programs` precisarão do mesmo worker — sem extração, cada um copia de novo.

Decisão registrada em `.claude/.planning/ASYNC-MESSAGING-STRATEGY.md` (endossada pelo Gabriel):
manter outbox-MySQL e **extrair um worker genérico** em `src/shared/outbox/`; sem broker/Go.

## Única variação entre os módulos

O `ProcessedEvent` e o passo de mapeamento da row:
- **contracts**: desserializa (`outboxRowToEvent`) → `ProcessedEvent = { eventId, eventType, schemaVersion, event }`; payload corrupto → **DLQ direto** (sem incrementar attempt).
- **partners**: payload opaco → `ProcessedEvent = { eventId, eventType, aggregateId, aggregateType, schemaVersion, occurredAt, payload }`; nunca falha no mapeamento.

→ Parametrizar por `<P>` (tipo do processed) + `rowToProcessed: (row) => Result<P, {tag}>`.

## Escopo

1. `src/shared/outbox/` — tipos canônicos (`OutboxRow`, `OutboxBatchOps`, `WorkerOutboxOps`,
   `OutboxQueryError`, `WorkerConfig`, `WorkerStats`, `EventDelivery<P>`, `DeliveryError`,
   `deliveryUnavailable`/`deliveryRejectedByConsumer`) + `runOnce<P>`/`runLoop<P>` genérico.
2. Migrar `contracts/worker` e `partners/worker` para wrappers finos que injetam
   `rowToProcessed` + `tag`. Ports dos módulos re-exportam de `shared/outbox` (ou passam a
   importá-lo) sem quebrar imports existentes.
3. **Comportamento inalterado** — os testes unit/integração atuais dos dois workers são a
   rede de segurança e devem permanecer verdes.

## Critérios de Aceite

- **CA1** `runOnce` genérico: delivery ok → `markProcessed`; `stats.delivered++`.
- **CA2** delivery err com `attempts+1 < maxAttempts` → `markFailed`; `stats.failed++`.
- **CA3** delivery err com `attempts+1 >= maxAttempts` → `moveToDeadLetter`; `stats.movedToDeadLetter++`.
- **CA4** `rowToProcessed` err → `moveToDeadLetter` direto, **sem** chamar `deliver`.
- **CA5** `deliver` que **lança** → tratado como err (não aborta o batch).
- **CA6** `runLoop` respeita `AbortSignal` (encerra) e acumula `WorkerStats`.
- **CA7** Sem regressão: suítes atuais de contracts/partners worker (unit + `test:integration`) verdes.

## Fora de escopo

- Coordenação de jobs one-shot multi-instância (`GET_LOCK`/`UNIQUE`) — ticket futuro (ADR-0041).
- Promoção do ADR-0030 (Valkey) — horizonte de meses (multi-instância).
- Worker do `financial` (é a feature 014, que nasce sobre este genérico).
