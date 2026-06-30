/**
 * PAR-CONTRACT-COUNT-READMODEL (US6b) — store Drizzle do read-model de contagem —
 * gated MYSQL_INTEGRATION=1. `applyMigrations` exercita a migration 0015 (`par_contract_count_view`
 * + `par_contract_count_processed`). Foco: **idempotência por eventId** (dedup) + delta ±1 contra
 * MySQL real. Sem o env, a suite é skipped.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const CONTRACTOR = '22222222-2222-4222-8222-222222222222';

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`open failed: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) {
      await handle.db.delete(handle.schema.parContractCountView);
      await handle.db.delete(handle.schema.parContractCountProcessed);
    }
  });

  describe('DrizzleContractCountStore', () => {
    it('applyDelta(+1) → getCount = 1', async () => {
      if (handle === null) return;
      const store = createDrizzleContractCountStore(handle);
      assert.equal(
        (await store.applyDelta({ contractorRef: CONTRACTOR, delta: 1, eventId: 'e1' })).ok,
        true,
      );
      const c = await store.getCount(CONTRACTOR);
      assert.ok(c.ok);
      if (c.ok) assert.equal(c.value, 1);
    });

    it('idempotência por eventId: mesmo eventId 2x → getCount = 1', async () => {
      if (handle === null) return;
      const store = createDrizzleContractCountStore(handle);
      await store.applyDelta({ contractorRef: CONTRACTOR, delta: 1, eventId: 'e1' });
      await store.applyDelta({ contractorRef: CONTRACTOR, delta: 1, eventId: 'e1' });
      const c = await store.getCount(CONTRACTOR);
      if (c.ok) assert.equal(c.value, 1);
    });

    it('delta -1 (eventId distinto) → getCount = 0', async () => {
      if (handle === null) return;
      const store = createDrizzleContractCountStore(handle);
      await store.applyDelta({ contractorRef: CONTRACTOR, delta: 1, eventId: 'e1' });
      await store.applyDelta({ contractorRef: CONTRACTOR, delta: -1, eventId: 'e2' });
      const c = await store.getCount(CONTRACTOR);
      if (c.ok) assert.equal(c.value, 0);
    });

    it('getCount de contraparte desconhecida → 0', async () => {
      if (handle === null) return;
      const store = createDrizzleContractCountStore(handle);
      const c = await store.getCount('00000000-0000-4000-8000-000000000000');
      if (c.ok) assert.equal(c.value, 0);
    });
  });
}
