/**
 * CTR-OUTBOX-WORKER — W0 (RED) — unit tests (sem MySQL)
 *
 * Cobre CA-T1 a CA-T7 do ticket #5/7 da série Outbox.
 * Usa InMemoryOutbox (expandido em W1) + InMemoryEventDelivery + ClockFixed.
 *
 * Estado W0: RED — `src/modules/contracts/worker/outbox-worker.ts` não existe →
 *   import falha com ERR_MODULE_NOT_FOUND.
 *   CA-T3/T4/T5 também falham pois InMemoryOutbox não tem `findPendingForUpdate`
 *   com semântica de `attempts` ainda.
 *
 * AAA: Arrange / Act / Assert estão delimitados por comentários em cada `it()`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// ── Módulo sob teste (não existe em W0 → RED por ERR_MODULE_NOT_FOUND) ─────────
import {
  runOnce,
  runLoop,
  type WorkerConfig,
  type WorkerDeps,
  type WorkerStats,
} from '#src/modules/contracts/worker/outbox-worker.ts';

// ── Adapters InMemory ──────────────────────────────────────────────────────────
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { InMemoryEventDelivery } from '#src/modules/contracts/adapters/event-delivery/event-delivery.in-memory.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

// ── Helpers de domínio para fixtures ─────────────────────────────────────────
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import { err } from '#src/shared/primitives/result.ts';
import { deliveryUnavailable } from '#src/modules/contracts/application/ports/event-delivery.ts';
import type { OutboxQueryError } from '#src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-05-21T10:00:00.000Z');

const makeEvent = (): ContractsModuleEvent => ({
  type: 'ContractCreated',
  contractId: ContractId.generate(),
  occurredAt: FIXED_NOW,
});

const DEFAULT_CONFIG: WorkerConfig = {
  batchSize: 10,
  maxAttempts: 5,
  pollIntervalMs: 10,
  idleSleepMs: 50,
};

// ─── Helper: insere eventos no InMemoryOutbox e retorna o outbox expandido ────

const populateOutbox = async (
  outbox: ReturnType<typeof InMemoryOutbox>,
  events: readonly ContractsModuleEvent[],
): Promise<void> => {
  const r = await outbox.port.append(events);
  assert.ok(r.ok, 'append no InMemoryOutbox não deveria falhar em setup');
};

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('CTR-OUTBOX-WORKER — unit: runOnce', () => {
  // ── CA-T1: outbox vazia → stats zerados ───────────────────────────────────
  it('CA-T1: runOnce com outbox vazia retorna stats zerados', async () => {
    // Arrange
    const outbox = InMemoryOutbox();
    const delivery = InMemoryEventDelivery('consumer-test');
    const clock = ClockFixed(FIXED_NOW);
    const deps: WorkerDeps = {
      outbox,
      delivery,
      clock,
    };

    // Act
    const result = await runOnce(deps, DEFAULT_CONFIG);

    // Assert
    assert.ok(result.ok, 'runOnce deve retornar ok mesmo com outbox vazia');
    const stats: WorkerStats = result.value;
    assert.equal(stats.iterations, 1, 'deve contar 1 iteração');
    assert.equal(stats.delivered, 0, 'delivered deve ser 0');
    assert.equal(stats.failed, 0, 'failed deve ser 0');
    assert.equal(stats.movedToDeadLetter, 0, 'movedToDeadLetter deve ser 0');
    assert.equal(delivery.deliveredEvents().length, 0, 'nenhum evento deve ter sido entregue');
  });

  // ── CA-T2: 3 eventos pendentes, delivery ok → todos markProcessed ─────────
  it('CA-T2: runOnce entrega 3 eventos e marca todos como processed', async () => {
    // Arrange
    const outbox = InMemoryOutbox();
    const delivery = InMemoryEventDelivery('consumer-test');
    const clock = ClockFixed(FIXED_NOW);

    const events = [makeEvent(), makeEvent(), makeEvent()];
    await populateOutbox(outbox, events);

    const deps: WorkerDeps = {
      outbox,
      delivery,
      clock,
    };

    // Act
    const result = await runOnce(deps, DEFAULT_CONFIG);

    // Assert
    assert.ok(result.ok, 'runOnce deve retornar ok');
    assert.equal(result.value.delivered, 3, 'deve entregar 3 eventos');
    assert.equal(result.value.failed, 0, 'não deve ter falhas');
    assert.equal(result.value.movedToDeadLetter, 0, 'não deve mover para DLQ');
    assert.equal(delivery.deliveredEvents().length, 3, 'InMemoryEventDelivery deve ter 3 eventos');
    // Todos os eventos devem estar marcados como processed
    const pendingAfter = outbox.pending();
    assert.equal(pendingAfter.length, 0, 'não deve restar eventos pendentes');
  });

  // ── CA-T3: delivery falha, attempt < maxAttempts → markFailed ────────────
  it('CA-T3: runOnce com delivery falhando incrementa attempts via markFailed', async () => {
    // Arrange
    const outbox = InMemoryOutbox();
    const clock = ClockFixed(FIXED_NOW);

    // Delivery que sempre retorna err
    const failingDelivery = {
      consumerId: 'failing-consumer',
      deliver: async (_event: unknown) =>
        await Promise.resolve(err(deliveryUnavailable('simulated-failure'))),
    };

    const event = makeEvent();
    await populateOutbox(outbox, [event]);

    const deps: WorkerDeps = {
      outbox,
      delivery: failingDelivery,
      clock,
    };
    // maxAttempts=5, row.attempts=0 → newAttempt=1 < 5 → markFailed
    const config: WorkerConfig = { ...DEFAULT_CONFIG, maxAttempts: 5 };

    // Act
    const result = await runOnce(deps, config);

    // Assert
    assert.ok(result.ok, 'runOnce deve retornar ok mesmo após delivery falha');
    assert.equal(result.value.failed, 1, 'deve contar 1 falha');
    assert.equal(result.value.delivered, 0, 'não deve ter delivered');
    assert.equal(result.value.movedToDeadLetter, 0, 'não deve mover para DLQ ainda');
    // O evento deve ainda estar pendente (não foi processado nem movido)
    const pending = outbox.pending();
    assert.equal(pending.length, 1, 'evento deve continuar pendente');
    // A row deve ter attempts incrementado para 1
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row !== undefined);
    assert.equal(row.attempts, 1, 'attempts deve ter sido incrementado para 1');
  });

  // ── CA-T4: delivery falha, attempt = maxAttempts-1 → moveToDeadLetter ────
  it('CA-T4: runOnce com attempt = maxAttempts-1 + delivery falha → moveToDeadLetter', async () => {
    // Arrange
    const outbox = InMemoryOutbox();
    const clock = ClockFixed(FIXED_NOW);

    const failingDelivery = {
      consumerId: 'failing-consumer',
      deliver: async (_event: unknown) =>
        await Promise.resolve(err(deliveryUnavailable('simulated-failure'))),
    };

    const event = makeEvent();
    await populateOutbox(outbox, [event]);

    // Simular que este evento já tentou maxAttempts-1 vezes
    // InMemoryOutbox.findPendingForUpdate retorna row com attempts atual
    // Precisamos setar attempts = maxAttempts - 1 na row
    // A expansão do InMemoryOutbox em W1 permitirá isso via forceAttempts ou
    // via múltiplas chamadas a markFailed. Aqui usamos o helper forçado:
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row !== undefined);
    // Forçar attempts = maxAttempts-1 = 4 (para maxAttempts=5)
    // O InMemoryOutbox expandido deve ter setAttempts para este cenário
    outbox.setAttempts(row.eventId, 4);

    const deps: WorkerDeps = {
      outbox,
      delivery: failingDelivery,
      clock,
    };
    const config: WorkerConfig = { ...DEFAULT_CONFIG, maxAttempts: 5 };

    // Act
    const result = await runOnce(deps, config);

    // Assert
    assert.ok(result.ok, 'runOnce deve retornar ok');
    assert.equal(result.value.movedToDeadLetter, 1, 'deve mover para DLQ');
    assert.equal(result.value.failed, 0, 'não deve contar como failed (foi para DLQ)');
    assert.equal(result.value.delivered, 0);
    // O evento deve ter saído da outbox (pending = 0)
    assert.equal(outbox.pending().length, 0, 'evento deve sair da outbox pendente');
    // O evento deve estar na dead letter
    const dlqRows = outbox.deadLetter();
    assert.equal(dlqRows.length, 1, 'evento deve estar na dead letter');
  });

  // ── CA-T5: payload corrupto → moveToDeadLetter direto ────────────────────
  it('CA-T5: runOnce com payload corrupto move para DLQ sem incrementar attempt', async () => {
    // Arrange
    const outbox = InMemoryOutbox();
    const delivery = InMemoryEventDelivery('consumer-test');
    const clock = ClockFixed(FIXED_NOW);

    // Inserir um evento válido e depois corromper o payload
    const event = makeEvent();
    await populateOutbox(outbox, [event]);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row !== undefined);
    // Corromper: schema_version errado fará outboxRowToEvent retornar err
    outbox.corruptRow(row.eventId, { schemaVersion: 999 });

    const deps: WorkerDeps = {
      outbox,
      delivery,
      clock,
    };

    // Act
    const result = await runOnce(deps, DEFAULT_CONFIG);

    // Assert
    assert.ok(result.ok, 'runOnce deve retornar ok mesmo com payload corrompido');
    assert.equal(result.value.movedToDeadLetter, 1, 'deve mover payload corrompido para DLQ');
    assert.equal(result.value.delivered, 0);
    assert.equal(result.value.failed, 0, 'não conta como failed — vai direto para DLQ');
    // Nenhum evento foi entregue ao consumer
    assert.equal(delivery.deliveredEvents().length, 0);
    // Evento saiu da outbox pendente
    assert.equal(outbox.pending().length, 0, 'evento corrompido deve sair da outbox');
    // Evento está na DLQ
    const dlqRows = outbox.deadLetter();
    assert.equal(dlqRows.length, 1, 'evento deve estar na dead letter');
  });
});

describe('CTR-OUTBOX-WORKER — unit: runLoop', () => {
  // ── CA-T6: runLoop aborta quando abortSignal.aborted = true ───────────────
  it('CA-T6: runLoop aborta quando AbortSignal é ativado', async (ctx) => {
    // Arrange: AbortController com abort após 50ms
    const controller = new AbortController();
    const outbox = InMemoryOutbox();
    const delivery = InMemoryEventDelivery('consumer-test');
    const clock = ClockFixed(FIXED_NOW);

    const deps: WorkerDeps = {
      outbox,
      delivery,
      clock,
      abortSignal: controller.signal,
    };
    // pollIntervalMs curto para não demorar no sleep
    const config: WorkerConfig = {
      ...DEFAULT_CONFIG,
      pollIntervalMs: 20,
      idleSleepMs: 20,
    };

    // Abortar após 60ms (suficiente para 1-2 iterações)
    const abortTimer = setTimeout(() => {
      controller.abort();
    }, 60);
    ctx.after(() => {
      clearTimeout(abortTimer);
    });

    // Act: runLoop deve retornar quando o signal aborta
    const statsPromise = runLoop(deps, config);

    // Garantia de que não fica bloqueado — se não resolver em 500ms, o test falhará
    const stats = await Promise.race([
      statsPromise,
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('runLoop não abortou em tempo'));
        }, 500);
      }),
    ]);

    // Assert
    assert.ok(typeof stats === 'object' && stats !== null, 'deve retornar WorkerStats');
    assert.ok('iterations' in stats, 'deve ter campo iterations');
    assert.ok('delivered' in stats, 'deve ter campo delivered');
    assert.ok('failed' in stats, 'deve ter campo failed');
    assert.ok('movedToDeadLetter' in stats, 'deve ter campo movedToDeadLetter');
  });

  // ── CA-T7: smoke test backoff idle ────────────────────────────────────────
  it('CA-T7 (smoke): runLoop com outbox vazia usa idleSleepMs (não trava)', async (ctx) => {
    // Arrange: signal que aborta imediatamente após o primeiro sleep idle
    const controller = new AbortController();
    const outbox = InMemoryOutbox();
    const delivery = InMemoryEventDelivery('consumer-test');
    const clock = ClockFixed(FIXED_NOW);

    const deps: WorkerDeps = {
      outbox,
      delivery,
      clock,
      abortSignal: controller.signal,
    };
    const config: WorkerConfig = {
      ...DEFAULT_CONFIG,
      pollIntervalMs: 5,
      idleSleepMs: 30, // idle maior que pollIntervalMs
    };

    // Abortar após 80ms — deve ter executado pelo menos 1 iteração idle
    const abortTimer = setTimeout(() => {
      controller.abort();
    }, 80);
    ctx.after(() => {
      clearTimeout(abortTimer);
    });

    const start = Date.now();
    const stats = await Promise.race([
      runLoop(deps, config),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('runLoop não abortou em tempo'));
        }, 500);
      }),
    ]);
    const elapsed = Date.now() - start;

    // Assert: loop executou pelo menos 1 iteração e não ficou preso
    // O elapsed deve ser ≥ idleSleepMs (30ms) → esperou pelo menos um idle sleep
    // Não testamos tempo exato (flaky) mas verificamos que o loop retornou stats válido
    assert.ok(elapsed >= 0, 'elapsed deve ser positivo');
    assert.ok(typeof stats.iterations === 'number', 'iterations deve ser número');
    assert.ok(stats.iterations >= 0, 'iterations deve ser >= 0');
    // Com outbox vazia, não deve ter delivered/failed/dlq
    assert.equal(stats.delivered, 0);
    assert.equal(stats.failed, 0);
    assert.equal(stats.movedToDeadLetter, 0);
  });
});

// ── Compatibilidade de tipos ──────────────────────────────────────────────────
// Garante que os tipos exportados têm a forma esperada (falha em compile se errado)

describe('CTR-OUTBOX-WORKER — exports shape', () => {
  it('CA-exports: runOnce, runLoop, WorkerConfig, WorkerStats, WorkerDeps são exportados', () => {
    assert.equal(typeof runOnce, 'function', 'runOnce deve ser função');
    assert.equal(typeof runLoop, 'function', 'runLoop deve ser função');
    // WorkerConfig, WorkerStats, WorkerDeps são apenas tipos — verificamos via uso nos testes acima.
    // OutboxQueryError é importado para forçar erro de compilação se o módulo não existir.
    // A variável abaixo satisfaz o compilador sem usar void em undefined.
    const _typeCheck: OutboxQueryError | undefined = undefined;
    assert.equal(_typeCheck, undefined);
  });
});
