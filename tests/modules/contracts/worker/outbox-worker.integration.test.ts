/**
 * CTR-OUTBOX-WORKER — W0 (RED) — integration tests (com MySQL real)
 *
 * Cobre CA-I1 a CA-I3 do ticket #5/7 da série Outbox.
 *
 * Guard: MYSQL_INTEGRATION=1.
 * Setup: 1 handle MySQL compartilhado por arquivo + truncate em beforeEach.
 * CA-I2 usa 2 handles (2 pools) para simular workers concorrentes reais.
 *
 * Estado W0: RED — `src/modules/contracts/worker/outbox-worker.ts` não existe →
 *   import falha com ERR_MODULE_NOT_FOUND.
 *
 * AAA: Arrange / Act / Assert delimitados por comentários.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// ── Módulo sob teste ──────────────────────────────────────────────────────────
import {
  runOnce,
  type WorkerConfig,
  type WorkerDeps,
} from '#src/modules/contracts/worker/outbox-worker.ts';

// ── Infra Drizzle ─────────────────────────────────────────────────────────────
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleOutboxRepository } from '#src/modules/contracts/adapters/persistence/repos/outbox-repository.drizzle.ts';

// ── Adapters InMemory para delivery ───────────────────────────────────────────
import { InMemoryEventDelivery } from '#src/modules/contracts/adapters/event-delivery/event-delivery.in-memory.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

// ── Helpers de domínio para fixtures ─────────────────────────────────────────
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

// ─── Configuração ─────────────────────────────────────────────────────────────

const VALID_CONN = mysqlTestConnectionString();
const FIXED_NOW = new Date('2026-05-21T10:00:00.000Z');

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeEvent = (): ContractsModuleEvent => ({
  type: 'ContractCreated',
  contractId: ContractId.generate(),
  occurredAt: FIXED_NOW,
});

const DEFAULT_CONFIG: WorkerConfig = {
  batchSize: 10,
  maxAttempts: 3,
  pollIntervalMs: 10,
  idleSleepMs: 20,
};

// ─── Truncate outbox tables ───────────────────────────────────────────────────

const truncateOutbox = async (handle: MysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  await db.delete(schema.ctrOutboxDeadLetter);
  await db.delete(schema.ctrOutbox);
};

// ─── Integration test suite ───────────────────────────────────────────────────

if (integrationEnabled()) {
  let handle: MysqlHandle | null = null;

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) {
      throw new Error(`Falha ao abrir MySQL: ${JSON.stringify(r.error)}`);
    }
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  beforeEach(async () => {
    if (handle !== null) {
      await truncateOutbox(handle);
    }
  });

  describe('CTR-OUTBOX-WORKER — integration', () => {
    // ── CA-I1: worker integra com Drizzle, entrega 5 eventos reais ─────────
    it('CA-I1: worker entrega 5 eventos reais do MySQL e marca todos como processed', async () => {
      // Arrange
      assert.ok(handle !== null, 'handle MySQL deve estar disponível');
      const repo = createDrizzleOutboxRepository(handle);
      const delivery = InMemoryEventDelivery('consumer-i1');
      const clock = ClockFixed(FIXED_NOW);

      // Inserir 5 eventos na outbox via append (simula o que o repo de domínio faz)
      const events: ContractsModuleEvent[] = Array.from({ length: 5 }, () => makeEvent());
      const appendResult = await repo.append(events);
      assert.ok(appendResult.ok, 'append deve ter sucesso');

      const deps: WorkerDeps = {
        outbox: repo,
        delivery,
        clock,
      };

      // Act
      const result = await runOnce(deps, DEFAULT_CONFIG);

      // Assert
      assert.ok(result.ok, 'runOnce deve retornar ok');
      assert.equal(result.value.delivered, 5, 'deve entregar 5 eventos');
      assert.equal(result.value.failed, 0);
      assert.equal(result.value.movedToDeadLetter, 0);
      assert.equal(
        delivery.deliveredEvents().length,
        5,
        'InMemoryEventDelivery deve ter 5 eventos',
      );

      // Verificar no banco que todos estão com processed_at preenchido
      const pendingAfter = await repo.findPendingForUpdate(10);
      assert.ok(pendingAfter.ok);
      assert.equal(pendingAfter.value.length, 0, 'não deve restar eventos pendentes no banco');
    });

    // ── CA-I2: 2 workers paralelos — SKIP LOCKED garante particionamento ──
    it('CA-I2: 2 workers paralelos não duplicam delivery (FOR UPDATE SKIP LOCKED)', async () => {
      // Arrange
      assert.ok(handle !== null, 'handle MySQL deve estar disponível');

      // Abrir segundo handle separado para simular worker 2 com pool independente
      const r2 = await openMysql({ connectionString: VALID_CONN, applyMigrations: false });
      assert.ok(r2.ok, 'segundo handle deve abrir com sucesso');
      const handle2 = r2.value;

      try {
        const repo1 = createDrizzleOutboxRepository(handle);
        const repo2 = createDrizzleOutboxRepository(handle2);
        const delivery1 = InMemoryEventDelivery('worker-1');
        const delivery2 = InMemoryEventDelivery('worker-2');
        const clock = ClockFixed(FIXED_NOW);

        // Inserir 6 eventos na outbox
        const events: ContractsModuleEvent[] = Array.from({ length: 6 }, () => makeEvent());
        const appendResult = await repo1.append(events);
        assert.ok(appendResult.ok, 'append deve ter sucesso');

        const deps1: WorkerDeps = { outbox: repo1, delivery: delivery1, clock };
        const deps2: WorkerDeps = { outbox: repo2, delivery: delivery2, clock };

        // Act: dois workers rodando em paralelo
        const config: WorkerConfig = { ...DEFAULT_CONFIG, batchSize: 10 };
        const [r1, r2res] = await Promise.all([runOnce(deps1, config), runOnce(deps2, config)]);

        // Assert
        assert.ok(r1.ok, 'worker 1 deve ter sucesso');
        assert.ok(r2res.ok, 'worker 2 deve ter sucesso');

        const totalDelivered =
          delivery1.deliveredEvents().length + delivery2.deliveredEvents().length;

        // Total entregue deve ser exatamente 6 (sem duplicações)
        assert.equal(totalDelivered, 6, 'total de entregas deve ser 6 (sem duplicações)');

        // Verificar que nenhum evento foi entregue pelos dois workers
        const ids1 = new Set(delivery1.deliveredEvents().map((e) => e.eventId));
        const ids2 = new Set(delivery2.deliveredEvents().map((e) => e.eventId));
        for (const id of ids1) {
          assert.ok(!ids2.has(id), `evento ${id} não deve ser entregue por ambos workers`);
        }

        // Verificar que não restam pendentes
        const pendingAfter = await repo1.findPendingForUpdate(20);
        assert.ok(pendingAfter.ok);
        assert.equal(pendingAfter.value.length, 0, 'não deve restar eventos pendentes');
      } finally {
        await handle2.close();
      }
    });

    // ── CA-I3: DLQ após maxAttempts — evento sai da outbox, aparece na DLQ ─
    it('CA-I3: evento vai para DLQ após maxAttempts falhas consecutivas', async () => {
      // Arrange
      assert.ok(handle !== null, 'handle MySQL deve estar disponível');
      const repo = createDrizzleOutboxRepository(handle);
      const clock = ClockFixed(FIXED_NOW);

      // Delivery que sempre falha
      const failingDelivery = {
        consumerId: 'failing-consumer-i3',
        deliver: async (_event: unknown) => {
          const { err } = await import('#src/shared/primitives/result.ts');
          const { deliveryUnavailable } =
            await import('#src/modules/contracts/application/ports/event-delivery.ts');
          return err(deliveryUnavailable('permanent-failure'));
        },
      };

      // Inserir 1 evento
      const event = makeEvent();
      const appendResult = await repo.append([event]);
      assert.ok(appendResult.ok, 'append deve ter sucesso');

      const deps: WorkerDeps = {
        outbox: repo,
        delivery: failingDelivery,
        clock,
      };
      // maxAttempts=2 para DLQ rápido
      const config: WorkerConfig = { ...DEFAULT_CONFIG, maxAttempts: 2, batchSize: 5 };

      // Act: runOnce 2 vezes — na 2ª tentativa, newAttempt = 2 = maxAttempts → DLQ
      const round1 = await runOnce(deps, config);
      assert.ok(round1.ok, 'round 1 deve ter ok');
      assert.equal(round1.value.failed, 1, 'round 1: deve contar 1 falha (attempt 0 → 1 < max)');
      assert.equal(round1.value.movedToDeadLetter, 0, 'round 1: não deve ir para DLQ ainda');

      const round2 = await runOnce(deps, config);
      assert.ok(round2.ok, 'round 2 deve ter ok');
      assert.equal(round2.value.movedToDeadLetter, 1, 'round 2: deve mover para DLQ');
      assert.equal(round2.value.failed, 0, 'round 2: não conta como failed (foi para DLQ)');

      // Assert: evento não está mais na outbox
      const pendingAfter = await repo.findPendingForUpdate(10);
      assert.ok(pendingAfter.ok);
      assert.equal(pendingAfter.value.length, 0, 'evento deve ter saído da outbox');

      // Verificar via query direta na DLQ que o evento chegou lá
      const dlqRows = await handle.db.select().from(handle.schema.ctrOutboxDeadLetter);
      assert.equal(dlqRows.length, 1, 'deve ter 1 evento na DLQ');
      assert.equal(
        dlqRows[0]?.eventType,
        'ContractCreated',
        'evento na DLQ deve ser ContractCreated',
      );
    });
  });
}
