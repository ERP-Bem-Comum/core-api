// Teste de integração e2e: fin_outbox → consumer → fin_payable_view (financial, 1 pool).
//
// Valida a topologia do #307 ponta a ponta contra MySQL real: INSERT no fin_outbox → runOnce do
// worker genérico com o delivery do composition root → read-model fin_payable_view populado. Também
// exercita as migrations 0027 (fin_payable_view + CHECKs) e 0028 (fin_outbox_dead_letter) no banco
// real, e o `ON DUPLICATE KEY UPDATE` do store Drizzle. GATE: só com MYSQL_INTEGRATION=1.

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { runOnce } from '#src/shared/outbox/index.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { eq } from 'drizzle-orm';

import {
  finOutbox,
  finOutboxDeadLetter,
} from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { createDrizzleFinancialOutboxReader } from '#src/modules/financial/adapters/persistence/repos/fin-outbox-reader.drizzle.ts';
import { createDrizzlePayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  createPayableProjectionDelivery,
  rowToMessage,
} from '#src/workers/payable-view-projection/delivery.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[payable-projection:e2e] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('payable-view-projection — e2e fin_outbox → fin_payable_view', () => {
    let contracts: MysqlHandle;
    let financial: FinancialMysqlHandle;

    before(async () => {
      // ⚠️ Mesma dependência do `supplier-view-projection`: o claim por consumidor consulta
      // `eventos_processados` (ADR-0064), criada apenas pelo journal do `contracts` — tabela
      // cross-módulo sem dono entre os journals (#830). Sem isto, o SELECT do claim estoura com
      // tabela ausente e a falha aparece como se fosse defeito da projeção.
      const c = await openMysql({ connectionString, applyMigrations: true });
      if (!c.ok) throw new Error(`[e2e] contracts (eventos_processados): ${c.error}`);
      contracts = c.value;

      const f = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!f.ok) throw new Error(`[e2e] financial: ${f.error}`);
      financial = f.value;
    });

    after(async () => {
      await contracts?.close();
      await financial?.close();
    });

    it('DocumentSaved no fin_outbox é projetado em fin_payable_view (via runOnce)', async () => {
      const documentId = newUuid();
      const payableId = newUuid();
      const supplierRef = newUuid();
      const occurredAt = new Date('2026-06-15T12:00:00.000Z');

      await financial.db.insert(finOutbox).values({
        eventId: newUuid(),
        aggregateId: documentId,
        aggregateType: 'Document',
        eventType: 'DocumentSaved',
        schemaVersion: 1,
        occurredAt,
        enqueuedAt: occurredAt,
        processedAt: null,
        attempts: 0,
        payload: JSON.stringify({
          type: 'DocumentSaved',
          documentId,
          payableIds: [payableId],
          supplierRef,
          contractRef: null,
          categoryRef: null,
          costCenterRef: null,
          programRef: null,
          payables: [
            {
              payableId,
              kind: 'Parent',
              retentionType: null,
              valueCents: '77500',
              dueDate: '2026-07-01',
              status: 'Open',
            },
          ],
        }),
      });

      const outbox = createDrizzleFinancialOutboxReader(financial);
      const store = createDrizzlePayableViewStore(financial, ClockReal());
      const delivery = createPayableProjectionDelivery(store);

      const processed = await runOnce(
        { outbox, delivery, rowToProcessed: rowToMessage, clock: ClockReal(), tag: '[e2e] ' },
        { batchSize: 10, maxAttempts: 5, pollIntervalMs: 1 },
      );
      assert.equal(processed.ok, true);
      if (processed.ok) assert.equal(processed.value.delivered, 1);

      const list = await store.list();
      assert.equal(list.ok, true);
      if (list.ok) {
        const row = list.value.find((r) => r.payableId === payableId);
        assert.ok(row, 'esperava a linha projetada em fin_payable_view');
        assert.equal(row.valueCents, 77500);
        assert.equal(row.status, 'Open');
        assert.equal(row.supplierRef, supplierRef);
      }
    });

    // W2 (drizzle): caminho DLQ do reader — markFailed + moveToDeadLetter + not-found.
    it('markFailed + moveToDeadLetter movem a row p/ fin_outbox_dead_letter; not-found → err', async () => {
      const eventId = newUuid();
      const documentId = newUuid();
      const occurredAt = new Date('2026-06-15T12:00:00.000Z');
      await financial.db.insert(finOutbox).values({
        eventId,
        aggregateId: documentId,
        aggregateType: 'Document',
        eventType: 'DocumentSaved',
        schemaVersion: 1,
        occurredAt,
        enqueuedAt: occurredAt,
        processedAt: null,
        attempts: 0,
        payload: '{bad json',
      });

      const outbox = createDrizzleFinancialOutboxReader(financial);
      // Mesmo `consumerId` do worker real (`payable-view-projection/delivery.ts:22`) — as
      // tentativas gravadas na DLQ são as DESTE consumidor (#800/#824).
      const CONSUMER_ID = 'financial-payable-view';

      const failed = await outbox.markFailed(CONSUMER_ID, eventId, {
        now: new Date(),
        errorTag: 'apply-payable-event',
        attempt: 3,
      });
      assert.equal(failed.ok, true);

      const moved = await outbox.moveToDeadLetter(
        CONSUMER_ID,
        eventId,
        new Date(),
        'max-retries: bad payload',
      );
      assert.equal(moved.ok, true);

      // A row de origem PERMANECE em `fin_outbox` (#800/#824, ADR-0022:27-29: "o outbox retém as
      // entradas após a entrega… não deleta") — outros consumidores ainda precisam vê-la. Antes
      // do fanout, `moveToDeadLetter` fazia DELETE e este teste afirmava 0 rows; era o próprio
      // defeito que a mudança corrige. A DLQ recebeu a cópia completa em paralelo.
      const stillPending = await financial.db
        .select()
        .from(finOutbox)
        .where(eq(finOutbox.eventId, eventId));
      assert.equal(stillPending.length, 1, 'fin_outbox deve reter a row após moveToDeadLetter');
      const dl = await financial.db
        .select()
        .from(finOutboxDeadLetter)
        .where(eq(finOutboxDeadLetter.eventId, eventId));
      assert.equal(dl.length, 1);
      assert.equal(dl[0]?.lastError, 'max-retries: bad payload');
      assert.equal(dl[0]?.attempts, 3);

      // moveToDeadLetter de eventId inexistente → err (OutboxEventNotFound).
      const notFound = await outbox.moveToDeadLetter(CONSUMER_ID, newUuid(), new Date(), 'x');
      assert.equal(notFound.ok, false);
    });
  });
}
