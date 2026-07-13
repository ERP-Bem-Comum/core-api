// Teste de integração: ExpectedCounterpartStore (Drizzle + MySQL real) — contrapartida esperada (#269).
//
// Valida a migration 0034 (fin_expected_counterpart) + INSERT/SELECT + índice (destination_account_ref,
// status) e a publicação do evento no fin_outbox na MESMA tx do save (CA1/CA4).
//
// GATE: só roda com `MYSQL_INTEGRATION=1` (ver `package.json §test:integration:financial`).
// Espelha `cedente-account-store.drizzle-mysql.test.ts`.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { and, eq } from 'drizzle-orm';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.drizzle.ts';
import { finOutbox } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import { create } from '#src/modules/financial/domain/expected-counterpart/expected-counterpart.ts';

const buildCounterpart = () => {
  const r = create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef: CedenteAccountId.generate(),
    originAccountRef: CedenteAccountId.generate(),
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: newUuid(),
    originMovement: 'Debit',
    valueCents: 150000n,
    expectedDate: new Date('2026-07-01T00:00:00.000Z'),
  });
  if (!r.ok) throw new Error('test setup: counterpart');
  return r.value;
};

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:expected-counterpart-store] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  describe('ExpectedCounterpartStore — Drizzle + MySQL (integração · #269)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) {
        throw new Error(
          `[financial:expected-counterpart-store] Falha ao conectar ao MySQL: ${r.error}`,
        );
      }
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    it('CA1: save persiste Pending; listPendingByAccount(destino) + findById + findByOrigin round-trip', async () => {
      const store = createDrizzleExpectedCounterpartStore(handle);
      const built = buildCounterpart();
      const cp = built.counterpart;

      const saved = await store.save(cp, built.events);
      assert.equal(saved.ok, true, JSON.stringify(saved));

      const pending = await store.listPendingByAccount(cp.destinationAccountRef);
      assert.equal(pending.ok, true);
      if (pending.ok) {
        const found = pending.value.find((c) => String(c.id) === String(cp.id));
        assert.ok(found, 'contrapartida na fila de pendentes do destino');
        assert.equal(found.status, 'Pending');
        assert.equal(found.movement, 'Credit', 'oposto ao Debit da origem');
        assert.equal(found.valueCents, 150000n, 'bigint round-trip');
        assert.equal(String(found.destinationAccountRef), String(cp.destinationAccountRef));
      }

      const byId = await store.findById(cp.id);
      assert.equal(byId.ok && byId.value !== null && String(byId.value.id) === String(cp.id), true);

      const byOrigin = await store.findByOriginReconciliation(cp.originReconciliationRef);
      assert.equal(
        byOrigin.ok && byOrigin.value !== null,
        true,
        'localiza por origin_reconciliation_ref (undo)',
      );
    });

    it('CA4: save publica TransferCounterpartCreated no fin_outbox (mesma tx)', async () => {
      const store = createDrizzleExpectedCounterpartStore(handle);
      const built = buildCounterpart();

      const saved = await store.save(built.counterpart, built.events);
      assert.equal(saved.ok, true);

      const rows = await handle.db
        .select()
        .from(finOutbox)
        .where(
          and(
            eq(finOutbox.aggregateType, 'ExpectedCounterpart'),
            eq(finOutbox.aggregateId, String(built.counterpart.id)),
          ),
        );
      assert.equal(rows.length, 1, 'exatamente 1 evento no outbox');
      assert.equal(rows[0]?.eventType, 'TransferCounterpartCreated');
    });
  });
}
