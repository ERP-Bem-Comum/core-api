/**
 * PAR-OUTBOX-INFRA — W0 (RED) — outbox Drizzle/MySQL (partners) — gated MYSQL_INTEGRATION=1.
 *
 * Espelha o padrão dos testes drizzle-mysql do partners (supplier-repository.drizzle.test.ts):
 *   - Guard MYSQL_INTEGRATION=1; sem o env, a suite não roda.
 *   - 1 handle compartilhado por arquivo (before/after); delete das tabelas no beforeEach.
 *
 * Cobre os CAs de US1:
 *   - append na tx é ATÔMICO: rollback da tx → 0 rows na par_outbox.
 *   - FOR UPDATE SKIP LOCKED: 2 connections retornam conjuntos disjuntos.
 *   - CHECK aggregate_type IN ('Supplier'): valor fora do catálogo é rejeitado pelo MySQL.
 *
 * Estado W0: RED — createDrizzleOutboxRepository / appendOutboxInTx (partners) e o
 *   schema parOutbox ainda não existem → ERR_MODULE_NOT_FOUND nos imports.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { isOk } from '#src/shared/index.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import {
  createDrizzleOutboxRepository,
  appendOutboxInTx,
} from '#src/modules/partners/adapters/persistence/repos/outbox-repository.drizzle.ts';
import type { OutboxMessage } from '#src/modules/partners/application/ports/outbox.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const mkMessage = (over: Partial<OutboxMessage> = {}): OutboxMessage => ({
  eventId: over.eventId ?? randomUUID(),
  aggregateId: over.aggregateId ?? randomUUID(),
  aggregateType: over.aggregateType ?? 'Supplier',
  eventType: over.eventType ?? 'SupplierRegistered',
  occurredAt: over.occurredAt ?? new Date('2026-01-15T10:00:00.000Z'),
  payload:
    over.payload ?? JSON.stringify({ supplierRef: 'ref', name: 'X', document: '00000000000191' }),
});

const truncateOutbox = async (handle: PartnersMysqlHandle): Promise<void> => {
  await handle.db.delete(handle.schema.parOutboxDeadLetter);
  await handle.db.delete(handle.schema.parOutbox);
};

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`open failed: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  beforeEach(async () => {
    if (handle === null) throw new Error('handle não inicializado');
    await truncateOutbox(handle);
  });

  describe('PAR-OUTBOX-INFRA — append atômico na tx', () => {
    it('rollback da tx → 0 rows na par_outbox', async () => {
      if (handle === null) throw new Error('handle não inicializado');
      const h = handle;

      // appendOutboxInTx dentro de uma tx que lança DEPOIS do insert → rollback.
      await assert.rejects(async () => {
        await h.db.transaction(async (tx) => {
          await appendOutboxInTx(tx, h.schema, [mkMessage()]);
          throw new Error('forçar rollback');
        });
      });

      const rows = await h.db.select().from(h.schema.parOutbox);
      assert.equal(rows.length, 0, 'rollback deve remover o evento inserido');
    });

    it('commit da tx → 1 row na par_outbox', async () => {
      if (handle === null) throw new Error('handle não inicializado');
      const h = handle;
      const msg = mkMessage();

      await h.db.transaction(async (tx) => {
        await appendOutboxInTx(tx, h.schema, [msg]);
      });

      const rows = await h.db.select().from(h.schema.parOutbox);
      assert.equal(rows.length, 1);
      const row = rows[0];
      assert.ok(row !== undefined);
      assert.equal(row.eventId, msg.eventId);
      assert.equal(row.aggregateType, 'Supplier');
      assert.equal(row.processedAt, null);
      assert.equal(row.attempts, 0);
    });
  });

  describe('PAR-OUTBOX-INFRA — FOR UPDATE SKIP LOCKED', () => {
    it('findPendingForUpdate em 2 connections retorna conjuntos disjuntos', async () => {
      if (handle === null) throw new Error('handle não inicializado');
      const h1 = handle;
      const repo1 = createDrizzleOutboxRepository(h1);

      const msgs = [
        mkMessage({ occurredAt: new Date('2026-01-15T10:00:00.000Z') }),
        mkMessage({ occurredAt: new Date('2026-01-15T10:01:00.000Z') }),
        mkMessage({ occurredAt: new Date('2026-01-15T10:02:00.000Z') }),
        mkMessage({ occurredAt: new Date('2026-01-15T10:03:00.000Z') }),
      ];
      assert.equal(isOk(await repo1.append(msgs)), true);

      const h2Result = await openPartnersMysql({ connectionString: VALID_CONN });
      assert.equal(isOk(h2Result), true);
      if (!h2Result.ok) return;
      const handle2 = h2Result.value;

      try {
        const repo2 = createDrizzleOutboxRepository(handle2);
        let set1: readonly string[] = [];
        let set2: readonly string[] = [];

        await h1.db.transaction(async (tx) => {
          const { isNull, asc } = await import('drizzle-orm');
          const locked = await tx
            .select({ eventId: h1.schema.parOutbox.eventId })
            .from(h1.schema.parOutbox)
            .where(isNull(h1.schema.parOutbox.processedAt))
            .orderBy(asc(h1.schema.parOutbox.occurredAt))
            .limit(2)
            .for('update', { skipLocked: true });
          set1 = locked.map((r) => r.eventId);
          assert.equal(set1.length, 2);

          const pending2 = await repo2.findPendingForUpdate(2);
          assert.equal(isOk(pending2), true);
          if (!pending2.ok) return;
          set2 = pending2.value.map((r) => r.eventId);
          assert.equal(set2.length, 2);
        });

        const intersection = set1.filter((id) => set2.includes(id));
        assert.equal(intersection.length, 0, 'conjuntos devem ser disjuntos (SKIP LOCKED)');
        assert.equal(new Set([...set1, ...set2]).size, 4, 'union cobre os 4 eventos');
      } finally {
        await handle2.close();
      }
    });
  });

  describe('PAR-OUTBOX-INFRA — CHECK aggregate_type', () => {
    it('append com aggregate_type fora de Supplier é rejeitado pelo MySQL', async () => {
      if (handle === null) throw new Error('handle não inicializado');
      const h = handle;

      // O CHECK aggregate_type IN ('Supplier') deve rejeitar 'Financier'.
      // `append` captura o throw e devolve err (outbox-unavailable) — não ok.
      const bad = mkMessage({ aggregateType: 'Financier' });
      const repo = createDrizzleOutboxRepository(h);
      const r = await repo.append([bad]);
      assert.equal(r.ok, false, 'aggregate_type fora do catálogo deve falhar');

      const rows = await h.db.select().from(h.schema.parOutbox);
      assert.equal(rows.length, 0, 'nenhuma row deve ser persistida');
    });

    it('moveToDeadLetter move row para a DLQ atomicamente', async () => {
      if (handle === null) throw new Error('handle não inicializado');
      const h = handle;
      const repo = createDrizzleOutboxRepository(h);
      const msg = mkMessage();
      await repo.append([msg]);

      const failedAt = new Date('2026-05-21T12:00:00.000Z');
      const moved = await repo.moveToDeadLetter(msg.eventId, failedAt, 'max-retries');
      assert.equal(isOk(moved), true);

      assert.equal((await h.db.select().from(h.schema.parOutbox)).length, 0);
      const dlq = await h.db.select().from(h.schema.parOutboxDeadLetter);
      assert.equal(dlq.length, 1);
      const dlqRow = dlq[0];
      assert.ok(dlqRow !== undefined);
      assert.equal(dlqRow.eventId, msg.eventId);
      assert.equal(dlqRow.lastError, 'max-retries');
    });
  });
}
