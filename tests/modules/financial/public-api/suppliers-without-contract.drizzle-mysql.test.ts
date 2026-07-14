/**
 * Integração (REP-2 · #240) — openSuppliersWithoutContractReader (financial public-api).
 * Agrega `fin_payable_view` WHERE `contract_ref IS NULL` AND `supplier_ref IS NOT NULL` por
 * fornecedor (SUM value_cents, COUNT), LEFT JOIN `fin_supplier_view` p/ o nome. Valida contra
 * MySQL real (OrbStack) — o que o driver `memory` não cobre.
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED: `openSuppliersWithoutContractReader` ainda não existe.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openSuppliersWithoutContractReader } from '#src/modules/financial/public-api/suppliers-without-contract-projection.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const S1 = 'aa000000-0000-4000-8000-0000000000a1';
const S2 = 'bb000000-0000-4000-8000-0000000000b2';
const NOW = new Date('2026-07-01T12:00:00.000Z');

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:suppliers-without-contract] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openSuppliersWithoutContractReader — Drizzle + MySQL (REP-2 · #240)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:suppliers-without-contract] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      // Agregação de estado absoluto → dono das próprias precondições (limpa as duas views).
      await handle.db.delete(handle.schema.finPayableView);
      await handle.db.delete(handle.schema.finSupplierView);
    });

    const payable = (over: {
      payableId: string;
      supplierRef: string | null;
      contractRef: string | null;
      valueCents: number;
      status: string;
    }) => ({
      payableId: over.payableId,
      documentId: 'dc000000-0000-4000-8000-00000000d001',
      kind: 'Parent',
      supplierRef: over.supplierRef,
      contractRef: over.contractRef,
      valueCents: over.valueCents,
      dueDate: '2026-08-01',
      status: over.status,
      updatedAt: NOW,
    });

    it('CA4: agrega por fornecedor (contract_ref IS NULL, todos os status), nome via LEFT JOIN', async () => {
      await handle.db.insert(handle.schema.finSupplierView).values({
        supplierRef: S1,
        name: 'Fornecedor Alpha',
        document: '11222333000181',
        occurredAt: NOW,
        updatedAt: NOW,
      });
      await handle.db.insert(handle.schema.finPayableView).values([
        // S1 sem contrato: Open + Cancelled → conta os DOIS (todos os status), soma 150000
        payable({
          payableId: '11000000-0000-4000-8000-000000000011',
          supplierRef: S1,
          contractRef: null,
          valueCents: 100000,
          status: 'Open',
        }),
        payable({
          payableId: '21000000-0000-4000-8000-000000000021',
          supplierRef: S1,
          contractRef: null,
          valueCents: 50000,
          status: 'Cancelled',
        }),
        // S1 COM contrato → excluído
        payable({
          payableId: '31000000-0000-4000-8000-000000000031',
          supplierRef: S1,
          contractRef: '99000000-0000-4000-8000-000000009901',
          valueCents: 999,
          status: 'Open',
        }),
        // S2 sem contrato, sem linha em supplier_view → incluído, name null
        payable({
          payableId: '41000000-0000-4000-8000-000000000041',
          supplierRef: S2,
          contractRef: null,
          valueCents: 7000,
          status: 'Paid',
        }),
        // supplier_ref null → excluído
        payable({
          payableId: '51000000-0000-4000-8000-000000000051',
          supplierRef: null,
          contractRef: null,
          valueCents: 123,
          status: 'Open',
        }),
      ]);

      const readerR = await openSuppliersWithoutContractReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) return;
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();

      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;
      const byRef = new Map(r.value.map((s) => [s.supplierRef, s]));
      assert.equal(byRef.size, 2, 'só S1 e S2 (S com contrato e null-supplier fora)');

      const s1 = byRef.get(S1)!;
      assert.equal(s1.name, 'Fornecedor Alpha');
      assert.equal(s1.totalCents, 150000, 'soma inclui Cancelled');
      assert.equal(s1.payableCount, 2);

      const s2 = byRef.get(S2)!;
      assert.equal(s2.name, null, 'sem projeção em fin_supplier_view → null');
      assert.equal(s2.totalCents, 7000);
      assert.equal(s2.payableCount, 1);
    });
  });
}
