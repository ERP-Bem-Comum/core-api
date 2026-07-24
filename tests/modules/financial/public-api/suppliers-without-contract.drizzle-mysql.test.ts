/**
 * Integração (REP-2 · #240; semântica corrigida em #437) — openSuppliersWithoutContractReader
 * (financial public-api).
 *
 * **O que esta projeção é, depois da #437:** a lista de **CANDIDATOS** do relatório "Fornecedores
 * sem Contrato" — fornecedores com títulos `contract_ref IS NULL`, `kind='Parent'`, agregados
 * (SUM value_cents, COUNT) com o nome via LEFT JOIN `fin_supplier_view`.
 *
 * **O que ela NÃO é:** a resposta final do relatório. `contract_ref IS NULL` é filtro de LINHA
 * (barato, reduz o conjunto) — não decide se o fornecedor tem contrato. A pergunta "o fornecedor
 * tem contrato Active?" vive em `ctr_contracts`, e o JOIN `fin_*` × `ctr_*` é proibido (ADR-0006
 * `:150`/`:154`, ADR-0014 `:130`). Quem subtrai é o `reports`, em memória:
 * `tests/modules/reports/application/use-cases/list-suppliers-without-active-contract.test.ts`.
 *
 * **#437 muda aqui:** `kind='Parent'` entra no WHERE — filhos de retenção (ISS/IRRF/INSS/CSRF)
 * carregam o `supplier_ref` do fornecedor (`apply-payable-event.ts:78-79`) e inflavam a agregação.
 * `payableCount` passa a contar DOCUMENTOS (1 NFS-e = 1) e `totalCents` = líquido ao fornecedor.
 * A regra do REP-2 de somar TODOS os status de título (inclusive `Cancelled`) permanece.
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `financial`).
 * W0 RED (#437): o filtro `kind='Parent'` ainda não existe na projeção.
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

const S1 = 'aa000000-0000-4000-8000-0000000000a1';
const S2 = 'bb000000-0000-4000-8000-0000000000b2';
const NOW = new Date('2026-07-01T12:00:00.000Z');

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[financial:suppliers-without-contract] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  describe('openSuppliersWithoutContractReader — Drizzle + MySQL (REP-2 · #240 / #437)', () => {
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
      kind?: string;
      retentionType?: string | null;
      documentId?: string;
    }) => ({
      payableId: over.payableId,
      documentId: over.documentId ?? 'dc000000-0000-4000-8000-00000000d001',
      kind: over.kind ?? 'Parent',
      retentionType: over.retentionType ?? null,
      supplierRef: over.supplierRef,
      contractRef: over.contractRef,
      valueCents: over.valueCents,
      dueDate: '2026-08-01',
      status: over.status,
      updatedAt: NOW,
    });

    const listRows = async () => {
      const readerR = await openSuppliersWithoutContractReader({ connectionString });
      assert.equal(readerR.ok, true, JSON.stringify(readerR));
      if (!readerR.ok) throw new Error('reader não abriu');
      const reader = readerR.value;
      const r = await reader.list();
      await reader.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('list falhou');
      return new Map(r.value.map((s) => [s.supplierRef, s]));
    };

    it('candidatos: agrega por fornecedor (contract_ref IS NULL, todos os status), nome via LEFT JOIN', async () => {
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
        // Título COM contract_ref → fora da SOMA (filtro de linha). S1 segue candidato: a decisão
        // "S1 tem contrato Active?" é do `reports` via ctr_contracts, não desta projeção (#437).
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

      const byRef = await listRows();
      assert.equal(byRef.size, 2, 'só S1 e S2 (null-supplier fora)');

      const s1 = byRef.get(S1)!;
      assert.equal(s1.name, 'Fornecedor Alpha');
      assert.equal(s1.totalCents, 150000, 'soma inclui Cancelled; título com contract_ref fora');
      assert.equal(s1.payableCount, 2);

      const s2 = byRef.get(S2)!;
      assert.equal(s2.name, null, 'sem projeção em fin_supplier_view → null');
      assert.equal(s2.totalCents, 7000);
      assert.equal(s2.payableCount, 1);
    });

    it('CA3 (#437): kind=Parent — filhos de retenção (ISS/IRRF) fora da soma e da contagem', async () => {
      const DOC = 'dc000000-0000-4000-8000-00000000d777';
      await handle.db.insert(handle.schema.finPayableView).values([
        // 1 NFS-e sem contrato: pai 100000 + ISS 5000 + IRRF 1500. Os filhos carregam o MESMO
        // supplier_ref (apply-payable-event.ts:78-79) — hoje inflam a agregação.
        payable({
          payableId: '61000000-0000-4000-8000-000000000061',
          documentId: DOC,
          supplierRef: S1,
          contractRef: null,
          valueCents: 100000,
          status: 'Open',
          kind: 'Parent',
        }),
        payable({
          payableId: '71000000-0000-4000-8000-000000000071',
          documentId: DOC,
          supplierRef: S1,
          contractRef: null,
          valueCents: 5000,
          status: 'Open',
          kind: 'Child',
          retentionType: 'ISS',
        }),
        payable({
          payableId: '81000000-0000-4000-8000-000000000081',
          documentId: DOC,
          supplierRef: S1,
          contractRef: null,
          valueCents: 1500,
          status: 'Open',
          kind: 'Child',
          retentionType: 'IRRF',
        }),
      ]);

      const byRef = await listRows();

      const s1 = byRef.get(S1)!;
      assert.equal(s1.payableCount, 1, '1 NFS-e = 1 (filhos de retenção não contam)');
      assert.equal(s1.totalCents, 100000, 'líquido do pai — não 106500 (pai+ISS+IRRF)');
    });

    it('CA3 (#437): fornecedor cujos títulos sem contrato são SÓ filhos de retenção não é candidato', async () => {
      await handle.db.insert(handle.schema.finPayableView).values([
        payable({
          payableId: '91000000-0000-4000-8000-000000000091',
          supplierRef: S2,
          contractRef: null,
          valueCents: 5000,
          status: 'Open',
          kind: 'Child',
          retentionType: 'INSS',
        }),
      ]);

      const byRef = await listRows();

      assert.equal(
        byRef.has(S2),
        false,
        'só filho de retenção → sem documento próprio no relatório',
      );
      assert.equal(byRef.size, 0);
    });
  });
}
