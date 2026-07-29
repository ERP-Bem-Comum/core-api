/**
 * Integração (DASH-F5 · #242) — `openSuppliersWithoutContractReader().listTop(limit)` no MySQL real.
 *
 * Prova o Top-N do widget "Fornecedores sem Contrato" do Dashboard: reusa a MESMA agregação do REP-2
 * (`contract_ref IS NULL`, `kind='Parent'`, todos os status), acrescido de `ORDER BY sum DESC,
 * supplier_ref ASC LIMIT ?` — corte e desempate no SQL, nunca em memória. Semeia ≥6 candidatos com
 * totais distintos + 1 título COM contrato (fora da soma) e prova o corte no 5º por total desc.
 * Também prova o desempate ESTÁVEL (mesmo total → supplier_ref asc).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * Contrato de isolamento: limpa as duas views na ENTRADA (beforeEach), por tabela.
 * Molde: `suppliers-without-contract.drizzle-mysql.test.ts`.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { openSuppliersWithoutContractReader } from '#src/modules/financial/public-api/suppliers-without-contract-projection.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const connectionString =
  process.env['FINANCIAL_DATABASE_URL'] ??
  process.env['CONTRACTS_DATABASE_URL'] ??
  mysqlTestConnectionString();

const NOW = new Date('2026-07-01T12:00:00.000Z');
const sup = (n: number): string => `aa000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:suppliers-without-contract-top] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openSuppliersWithoutContractReader.listTop — Drizzle + MySQL (DASH-F5 · #242)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[financial:suppliers-without-contract-top] conexão: ${r.error}`);
      handle = r.value;
    });

    after(async () => {
      await handle?.close();
    });

    beforeEach(async () => {
      await handle.db.delete(handle.schema.finPayableView);
      await handle.db.delete(handle.schema.finSupplierView);
    });

    let pk = 0;
    const payable = (over: {
      supplierRef: string | null;
      contractRef: string | null;
      valueCents: number;
      status?: string;
      kind?: string;
    }) => ({
      payableId: `11000000-0000-4000-8000-${String(++pk).padStart(12, '0')}`,
      documentId: `dc000000-0000-4000-8000-${String(pk).padStart(12, '0')}`,
      kind: over.kind ?? 'Parent',
      retentionType: null,
      supplierRef: over.supplierRef,
      contractRef: over.contractRef,
      valueCents: over.valueCents,
      dueDate: '2026-08-01',
      status: over.status ?? 'Open',
      updatedAt: NOW,
    });

    const listTop = async (limit: number) => {
      const readerR = await openSuppliersWithoutContractReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) throw new Error('reader não abriu');
      const reader = readerR.value;
      const r = await reader.listTop(limit);
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('listTop falhou');
      return r.value;
    };

    it('Top-5 por total desc, corte no 5º (6 candidatos), título com contrato fora da soma', async () => {
      await handle.db.insert(handle.schema.finPayableView).values([
        payable({ supplierRef: sup(1), contractRef: null, valueCents: 50000 }),
        payable({ supplierRef: sup(2), contractRef: null, valueCents: 40000 }),
        payable({ supplierRef: sup(3), contractRef: null, valueCents: 30000 }),
        payable({ supplierRef: sup(4), contractRef: null, valueCents: 20000 }),
        payable({ supplierRef: sup(5), contractRef: null, valueCents: 10000 }),
        payable({ supplierRef: sup(6), contractRef: null, valueCents: 5000 }),
        // Título COM contrato → filtro de linha (fora da soma); não vira candidato próprio.
        payable({
          supplierRef: sup(7),
          contractRef: '99000000-0000-4000-8000-000000009901',
          valueCents: 99999,
        }),
      ]);

      const top = await listTop(5);
      assert.equal(top.length, 5, 'corte no 5º — 6 candidatos semeados');
      assert.deepEqual(
        top.map((s) => s.totalCents),
        [50000, 40000, 30000, 20000, 10000],
        'ordenado por total desc; o 6º (5000) fica de fora',
      );
      assert.deepEqual(
        top.map((s) => s.supplierRef),
        [sup(1), sup(2), sup(3), sup(4), sup(5)],
      );
    });

    it('desempate estável: mesmo total → supplier_ref asc', async () => {
      await handle.db
        .insert(handle.schema.finPayableView)
        .values([
          payable({ supplierRef: sup(3), contractRef: null, valueCents: 10000 }),
          payable({ supplierRef: sup(1), contractRef: null, valueCents: 10000 }),
          payable({ supplierRef: sup(2), contractRef: null, valueCents: 10000 }),
        ]);

      const top = await listTop(5);
      assert.deepEqual(
        top.map((s) => s.supplierRef),
        [sup(1), sup(2), sup(3)],
        'empate de total resolvido por supplier_ref asc (determinístico)',
      );
    });
  });
}
