# 000 — Request CTR-OUTBOX-WORKER

> **Ticket #5/7 da série Outbox. Size: L.** Implementa o loop polling do worker que consome `ctr_outbox` com `FOR UPDATE SKIP LOCKED`, entrega via `EventDelivery`, marca processed/failed, roteia para DLQ após N attempts.
> Depende de `CTR-OUTBOX-ADAPTER-DRIZZLE` ✅ (#3) + `CTR-OUTBOX-INTEGRATION-IN-REPOS` ✅ (#4).
> **NÃO implementa CLI subcommand** (ticket #6). Worker é função pura testável.
> 22º ticket Opção B.

## Decisões aplicáveis

- **D4** ✅ Worker = subcomando da CLI (escopo #6). Aqui só a **função pura** que o subcomando vai chamar.
- **D5** ✅ `EventDelivery` default = `LoggerEventDelivery`. Worker recebe via DI.

## Escopo

### 1. `src/modules/contracts/worker/outbox-worker.ts` — função pura

```ts
import { type Result, ok, err } from '../../../../shared/result.ts';
import type { OutboxPort } from '../application/ports/outbox.ts';
import type { EventDelivery, ProcessedEvent } from '../application/ports/event-delivery.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import { outboxRowToEvent } from '../adapters/persistence/mappers/outbox.mapper.ts';

export type WorkerConfig = Readonly<{
  batchSize: number;             // quantos eventos por iteração (default: 10)
  maxAttempts: number;           // antes de DLQ (default: 5)
  pollIntervalMs: number;        // sleep entre rounds vazios (default: 500ms)
  idleSleepMs?: number;          // sleep especial quando 0 eventos (default = pollIntervalMs)
}>;

export type WorkerStats = Readonly<{
  iterations: number;
  delivered: number;
  failed: number;
  movedToDeadLetter: number;
}>;

export type WorkerDeps = Readonly<{
  // Adapter Drizzle expõe além do OutboxPort 4 funções auxiliares (ver ticket #3)
  outbox: {
    findPendingForUpdate: (limit: number) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
    markProcessed: (eventId: string, now: Date) => Promise<Result<void, OutboxQueryError>>;
    markFailed: (eventId: string, now: Date, errorTag: string, attempt: number) => Promise<Result<void, OutboxQueryError>>;
    moveToDeadLetter: (eventId: string, now: Date, errorMessage: string) => Promise<Result<void, OutboxQueryError>>;
  };
  delivery: EventDelivery;
  clock: Clock;
  abortSignal?: AbortSignal;     // graceful shutdown (cancela loop)
}>;

/**
 * Executa UMA iteração do worker — útil para tests e integração.
 * Retorna stats da iteração (quantos delivered/failed/dlq) ou err se a leitura falhar.
 *
 * Fluxo:
 *   1. SELECT pendentes com FOR UPDATE SKIP LOCKED (até batchSize).
 *   2. Para cada row:
 *      a. outboxRowToEvent (deserializar)
 *      b. delivery.deliver(processedEvent)
 *      c. ok    → markProcessed
 *         err   → attempts+1; se attempts >= maxAttempts → moveToDeadLetter
 *                                 senão → markFailed
 */
export const runOnce = async (
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<Result<WorkerStats, OutboxQueryError>> => { /* ... */ };

/**
 * Loop infinito que chama runOnce até abortSignal.aborted ou erro crítico.
 * Backoff: pollIntervalMs quando há trabalho; idleSleepMs quando outbox vazia.
 */
export const runLoop = async (
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<WorkerStats> => { /* ... */ };
```

### 2. Lógica do `runOnce` — detalhada

```ts
// 1. Ler até batchSize eventos pendentes
const pendingResult = await deps.outbox.findPendingForUpdate(config.batchSize);
if (!pendingResult.ok) return err(pendingResult.error);
const rows = pendingResult.value;

let delivered = 0;
let failed = 0;
let dlqMoved = 0;

for (const row of rows) {
  // 2. Deserializar
  const eventResult = outboxRowToEvent(row);
  if (!eventResult.ok) {
    // Payload corrupto → vai direto pra DLQ (não conta como attempt normal)
    await deps.outbox.moveToDeadLetter(
      row.eventId,
      deps.clock.now(),
      `mapper-error: ${eventResult.error.tag}`,
    );
    dlqMoved += 1;
    continue;
  }

  // 3. Entregar
  const processed: ProcessedEvent = {
    eventId: row.eventId,
    eventType: row.eventType,
    schemaVersion: row.schemaVersion,
    event: eventResult.value,
  };
  const deliveryResult = await deps.delivery.deliver(processed);

  if (deliveryResult.ok) {
    await deps.outbox.markProcessed(row.eventId, deps.clock.now());
    delivered += 1;
  } else {
    // 4. Falha — incrementar attempts; se exceder, DLQ
    const newAttempt = row.attempts + 1;
    if (newAttempt >= config.maxAttempts) {
      await deps.outbox.moveToDeadLetter(
        row.eventId,
        deps.clock.now(),
        `delivery-error: ${deliveryResult.error.tag}`,
      );
      dlqMoved += 1;
    } else {
      await deps.outbox.markFailed(
        row.eventId,
        deps.clock.now(),
        deliveryResult.error.tag,
        newAttempt,
      );
      failed += 1;
    }
  }
}

return ok({ iterations: 1, delivered, failed, movedToDeadLetter: dlqMoved });
```

### 3. Lógica do `runLoop` — com graceful shutdown

```ts
export const runLoop = async (deps, config): Promise<WorkerStats> => {
  let totals = { iterations: 0, delivered: 0, failed: 0, movedToDeadLetter: 0 };

  while (!deps.abortSignal?.aborted) {
    const round = await runOnce(deps, config);
    if (!round.ok) {
      // Erro crítico (DB indisponível, etc.) — log + sleep + retry
      process.stderr.write(`[outbox-worker] runOnce failed: ${round.error.tag}\n`);
      await sleep(config.pollIntervalMs, deps.abortSignal);
      continue;
    }
    totals = {
      iterations: totals.iterations + 1,
      delivered: totals.delivered + round.value.delivered,
      failed: totals.failed + round.value.failed,
      movedToDeadLetter: totals.movedToDeadLetter + round.value.movedToDeadLetter,
    };
    // Backoff inteligente: idle se 0 entregues; normal se trabalho
    const wasIdle = round.value.delivered === 0 && round.value.failed === 0;
    const sleepMs = wasIdle ? (config.idleSleepMs ?? config.pollIntervalMs) : config.pollIntervalMs;
    await sleep(sleepMs, deps.abortSignal);
  }

  return totals;
};

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
  });
```

### 4. Tests

#### Unit (sem MySQL) — `tests/modules/contracts/worker/outbox-worker.test.ts`

Usa `InMemoryOutbox` + `InMemoryEventDelivery` + `ClockFixed`.

Cenários:
- **CA-T1:** `runOnce` com outbox vazia retorna stats zerados.
- **CA-T2:** `runOnce` entrega 3 eventos, marca todos como processed.
- **CA-T3:** `runOnce` com delivery falhando → markFailed + attempts incrementado.
- **CA-T4:** `runOnce` com attempt = maxAttempts-1 + delivery falha → moveToDeadLetter.
- **CA-T5:** `runOnce` com payload corrupto (mapper retorna err) → moveToDeadLetter direto.
- **CA-T6:** `runLoop` aborta quando `abortSignal.aborted = true` (setTimeout 100ms + abort).
- **CA-T7:** `runLoop` backoff idle quando 0 entregues (timing test com clock fake — opcional).

#### Integration (com MySQL) — `tests/modules/contracts/worker/outbox-worker.integration.test.ts`

Cenários:
- **CA-I1:** Worker integra com `createDrizzleOutboxRepository` — entrega real de 5 eventos.
- **CA-I2:** Concorrência 2 workers paralelos em mesma outbox — SKIP LOCKED garante particionamento. Nenhum evento entregue 2×.
- **CA-I3:** DLQ funcional após maxAttempts — evento sai da outbox, aparece na DLQ.

### 5. `InMemoryOutbox` helpers necessários

O port `OutboxPort` no #2 só tem `append`. Worker precisa de `findPendingForUpdate`, `markProcessed`, `markFailed`, `moveToDeadLetter`. Adicionar versões InMemory dessas funções no `InMemoryOutbox` (modo testHelpers ou expor diretamente).

**Decisão:** expandir `InMemoryOutbox()` retornar `{ port: OutboxPort, findPendingForUpdate, markProcessed, markFailed, moveToDeadLetter, all, pending, markProcessedSync }` — mesma interface que o Drizzle adapter para testabilidade trivial.

## Critérios de aceitação

- **CA1** — `src/modules/contracts/worker/outbox-worker.ts` exporta `runOnce` + `runLoop` + types (`WorkerConfig`, `WorkerStats`, `WorkerDeps`).
- **CA2** — `runOnce`: outbox vazia retorna `{ delivered: 0, failed: 0, movedToDeadLetter: 0 }`.
- **CA3** — `runOnce`: delivery OK → `markProcessed`.
- **CA4** — `runOnce`: delivery fail + attempt < maxAttempts → `markFailed`.
- **CA5** — `runOnce`: delivery fail + attempt = maxAttempts → `moveToDeadLetter`.
- **CA6** — `runOnce`: payload corrupto → `moveToDeadLetter` direto (sem incrementar attempt).
- **CA7** — `runLoop`: aborta quando `abortSignal.aborted = true`. Backoff inteligente.
- **CA8** — `InMemoryOutbox` expande com 4 funções auxiliares (mesma assinatura do Drizzle).
- **CA9** — Integration test: 2 workers paralelos não duplicam delivery (SKIP LOCKED).
- **CA10** — Gates: typecheck/test/test:integration/lint/format verdes.

## Não-objetivos

- CLI subcommand → ticket #6.
- `EventDelivery` adapters específicos por consumer → futuro quando Financeiro entrar.
- Métricas Prometheus → futuro.
- Webhook delivery → futuro.

## Risco / pontos de atenção

1. **Graceful shutdown via AbortSignal:** Node 24 padrão. Verificar que `sleep` cancela cleanly + transação em andamento (se houver) finaliza antes do loop sair.
2. **`runLoop` em test unit pode entrar em loop infinito** — sempre usar `AbortSignal` com timeout no setup do test.
3. **`InMemoryOutbox` precisa de `markFailed` com incremento de attempts** — atualmente só tem `markProcessed`. Adicionar.
4. **Concorrência test (CA-I2):** dois workers em mesma DB. Usar 2 connections (pool com 2+ slots).
5. **Backoff idle:** quando outbox vazia, sleep `idleSleepMs` (longer). Quando há trabalho, sleep `pollIntervalMs` curto. Evita overheating do MySQL com queries vazias.
6. **Mitigação Bug #47936** — ticket grande. Aceitar fallback admin.
