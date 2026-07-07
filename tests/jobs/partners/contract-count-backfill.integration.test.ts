// Integração e2e do backfill de contagem (#110): ctr_contracts (fonte) →
// createDrizzleContractCountReadStore (GROUP BY) → backfillContractCounts → par_contract_count_view.
// Valida a query GROUP BY + a semântica "vivo" (Pending/Active contam; Cancelled/Expired não) e a
// idempotência do setCount contra MySQL real. GATE: só com MYSQL_INTEGRATION=1 (W2/I1).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountReadStore } from '#src/modules/contracts/adapters/persistence/repos/contract-count-read.drizzle.ts';
import { openPartnersMysql } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import type { PartnersMysqlHandle } from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.drizzle.ts';
import { backfillContractCounts } from '#src/jobs/partners/contract-count-backfill/backfill.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[contract-count-backfill:e2e] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['CONTRACTS_DATABASE_URL'] ??
    'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

  // Contrapartes isoladas por este teste (afere só os próprios refs — coexiste com outros dados).
  const X = 'a0000000-0000-4000-8000-000000000001'; // 1 Active + 1 Pending → conta 2
  const Y = 'b0000000-0000-4000-8000-000000000002'; // 1 Active → conta 1
  const Z = 'c0000000-0000-4000-8000-000000000003'; // 1 Cancelled + 1 Expired → conta 0
  const REFS = [X, Y, Z] as const;

  const activeFields = {
    signedAt: new Date('2026-01-01'),
    originalValueCents: 1000,
    originalPeriodKind: 'Fixed' as const,
    originalPeriodStart: new Date('2026-01-01'),
    originalPeriodEnd: new Date('2026-12-31'),
    currentValueCents: 1000,
    currentPeriodKind: 'Fixed' as const,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-12-31'),
  };
  // Pending/Cancelled: signedAt + current* nulos (CHECK). Original* seguem notNull.
  const draftFields = {
    signedAt: null,
    originalValueCents: 1000,
    originalPeriodKind: 'Fixed' as const,
    originalPeriodStart: new Date('2026-01-01'),
    originalPeriodEnd: new Date('2026-12-31'),
    currentValueCents: null,
    currentPeriodKind: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
  };

  describe('contract-count-backfill — e2e ctr_contracts → par_contract_count_view', () => {
    let contracts: MysqlHandle;
    let partners: PartnersMysqlHandle;

    const seedContract = async (
      id: string,
      contractorId: string,
      status: 'Pending' | 'Active' | 'Cancelled' | 'Expired',
      endedAt: Date | null,
      fields: typeof activeFields | typeof draftFields,
    ): Promise<void> => {
      await contracts.db.insert(contracts.schema.contracts).values({
        id,
        sequentialNumber: `bkf-${id.slice(-4)}`,
        title: 'seed backfill',
        objective: 'seed backfill',
        contractorType: 'supplier',
        contractorId,
        status,
        endedAt,
        ...fields,
      });
    };

    before(async () => {
      const c = await openMysql({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!c.ok) throw new Error(`[backfill:e2e] contracts: ${c.error}`);
      contracts = c.value;
      const p = await openPartnersMysql({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!p.ok) throw new Error(`[backfill:e2e] partners: ${p.error}`);
      partners = p.value;

      // Limpa execuções anteriores destes refs (idempotência do teste).
      await contracts.db
        .delete(contracts.schema.contracts)
        .where(inArray(contracts.schema.contracts.contractorId, [...REFS]));
      await partners.db
        .delete(partners.schema.parContractCountView)
        .where(inArray(partners.schema.parContractCountView.contractorRef, [...REFS]));

      await seedContract(
        `${X.slice(0, 8)}-0000-4000-8000-0000000000a1`,
        X,
        'Active',
        null,
        activeFields,
      );
      await seedContract(
        `${X.slice(0, 8)}-0000-4000-8000-0000000000a2`,
        X,
        'Pending',
        null,
        draftFields,
      );
      await seedContract(
        `${Y.slice(0, 8)}-0000-4000-8000-0000000000b1`,
        Y,
        'Active',
        null,
        activeFields,
      );
      await seedContract(
        `${Z.slice(0, 8)}-0000-4000-8000-0000000000c1`,
        Z,
        'Cancelled',
        new Date('2026-02-01'),
        draftFields,
      );
      await seedContract(
        `${Z.slice(0, 8)}-0000-4000-8000-0000000000c2`,
        Z,
        'Expired',
        new Date('2026-03-01'),
        activeFields,
      );
    });

    after(async () => {
      await contracts?.close();
      await partners?.close();
    });

    it('CA1 — GROUP BY conta vivos (Pending+Active) e ignora Cancelled/Expired', async () => {
      const read = createDrizzleContractCountReadStore(contracts);
      const r = await read.listActiveContractCountsByContractor();
      assert.equal(r.ok, true);
      if (!r.ok) return;
      const byRef = new Map(r.value.map((row) => [row.contractorRef, row.activeCount]));
      assert.equal(byRef.get(X), 2);
      assert.equal(byRef.get(Y), 1);
      assert.equal(byRef.get(Z), undefined); // 0 vivos → ausente do GROUP BY
    });

    it('CA1+CA2 — backfill grava a contagem e é idempotente no banco', async () => {
      const read = createDrizzleContractCountReadStore(contracts);
      const store = createDrizzleContractCountStore(partners);
      const source = await read.listActiveContractCountsByContractor();
      assert.equal(source.ok, true);
      if (!source.ok) return;
      const mine = source.value.filter((row) =>
        (REFS as readonly string[]).includes(row.contractorRef),
      );

      await backfillContractCounts(mine, store);
      await backfillContractCounts(mine, store); // 2ª execução: absoluto, não soma

      const x = await store.getCount(X);
      const y = await store.getCount(Y);
      const z = await store.getCount(Z);
      if (x.ok) assert.equal(x.value, 2); // idempotente: 2, nunca 4
      if (y.ok) assert.equal(y.value, 1);
      if (z.ok) assert.equal(z.value, 0);
    });
  });
}
