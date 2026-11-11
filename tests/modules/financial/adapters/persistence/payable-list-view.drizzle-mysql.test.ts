// Integração (#221): PayableListView Drizzle — JOIN fin_payables ⋈ fin_documents. Semeia um documento
// NFS-e com 1 retenção (ISS) via saveDocument → pai + 1 filho em fin_payables; a query devolve as 2
// linhas com os campos do documento. GATE: MYSQL_INTEGRATION=1 (na lista do runner financial).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { openMysqlFinancial } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.drizzle.ts';
import { createDrizzlePayableListView } from '#src/modules/financial/adapters/persistence/repos/payable-list-view.drizzle.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import type { PayableListFilter } from '#src/modules/financial/domain/payable/query.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[financial:payable-list-view] MYSQL_INTEGRATION nao definido — pulando.\n');
} else {
  const connectionString =
    process.env['FINANCIAL_DATABASE_URL'] ??
    process.env['CONTRACTS_DATABASE_URL'] ??
    mysqlTestConnectionString();

  describe('#221 — PayableListView (Drizzle + MySQL · JOIN payable⋈documento)', () => {
    let handle: FinancialMysqlHandle;

    before(async () => {
      const r = await openMysqlFinancial({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[payable-list-view] conexao: ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('CA2/CA3: pai + filho como linhas distintas com campos do documento; filtro por fornecedor', async () => {
      const supplierRef = newUuid();
      const documentNumber = `NF-${newUuid().slice(0, 8)}`;
      const save = saveDocument({
        repo: createDrizzleDocumentRepository(handle),
        clock: ClockReal(),
        contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
        cedenteAccountStore: createInMemoryCedenteAccountStore(),
      });
      const created = await save({
        documentNumber,
        type: 'NFS-e',
        supplierRef,
        paymentMethod: 'PIX',
        grossValueCents: 1000000,
        retentions: [{ type: 'ISS', baseCents: 350000, rateBps: 1000, valueCents: 35000 }],
        registeredTaxes: [],
        dueDate: new Date('2026-12-31T00:00:00.000Z'),
        description: null,
      });
      assert.equal(created.ok, true, JSON.stringify(created));

      const view = createDrizzlePayableListView(handle);
      const r = await view.findPaged({ supplierRef }, 1, 50);
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) return;

      assert.equal(r.value.total, 2); // pai + 1 filho (ISS)
      const parent = r.value.items.find((i) => i.kind === 'Parent');
      const child = r.value.items.find((i) => i.kind === 'Child');
      assert.ok(parent !== undefined, 'esperava o título pai');
      assert.ok(child !== undefined, 'esperava o título filho (ISS)');
      assert.equal(parent?.documentNumber, documentNumber);
      assert.equal(parent?.documentType, 'NFS-e');
      assert.equal(parent?.supplierRef, supplierRef);
      assert.equal(parent?.valueCents, 965000); // 1.000.000 - 35.000 (ISS)
      assert.equal(child?.retentionType, 'ISS');
      assert.equal(child?.valueCents, 35000);
    });

    // Filtro pela EMISSÃO do documento (fin_documents.issue_date). Fornecedor único por execução
    // isola a massa (o arquivo não limpa tabela; a suíte roda no mesmo banco, rerun-safe).
    //   EARLY — emitido 2026-03-10, vence 2026-07-01, ISS → 2 títulos (pai + filho)
    //   LATE  — emitido 2026-05-20, vence 2026-08-01, sem retenção → 1 título
    //   NONE  — sem emissão (NULL), vence 2026-07-01, sem retenção → 1 título
    it('filtro por emissão: issuedFrom/issuedTo isolados e combinados, NULL excluído, counts == lista, AND com vencimento', async () => {
      const supplierRef = newUuid();
      const tag = newUuid().slice(0, 8);
      const save = saveDocument({
        repo: createDrizzleDocumentRepository(handle),
        clock: ClockReal(),
        contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
        cedenteAccountStore: createInMemoryCedenteAccountStore(),
      });
      const seed = async (
        label: string,
        issueDate: Date | null,
        dueDate: Date,
        withIss: boolean,
      ): Promise<void> => {
        const created = await save({
          documentNumber: `${label}-${tag}`,
          type: 'NFS-e',
          supplierRef,
          paymentMethod: 'PIX',
          grossValueCents: 1000000,
          retentions: withIss
            ? [{ type: 'ISS', baseCents: 350000, rateBps: 1000, valueCents: 35000 }]
            : [],
          registeredTaxes: [],
          dueDate,
          issueDate,
          description: null,
        });
        assert.equal(created.ok, true, JSON.stringify(created));
      };
      await seed(
        'EARLY',
        new Date('2026-03-10T00:00:00.000Z'),
        new Date('2026-07-01T00:00:00.000Z'),
        true,
      );
      await seed(
        'LATE',
        new Date('2026-05-20T00:00:00.000Z'),
        new Date('2026-08-01T00:00:00.000Z'),
        false,
      );
      await seed('NONE', null, new Date('2026-07-01T00:00:00.000Z'), false);

      const view = createDrizzlePayableListView(handle);
      const labels = (items: readonly { documentNumber: string | null }[]): string[] =>
        [...new Set(items.map((i) => (i.documentNumber ?? '∅').replace(`-${tag}`, '')))].sort();
      const list = async (extra: PayableListFilter) => {
        const r = await view.findPaged({ supplierRef, ...extra }, 1, 50);
        assert.equal(r.ok, true, JSON.stringify(r));
        if (!r.ok) throw new Error('unreachable');
        return r.value;
      };

      // Sem filtro de emissão, o documento sem issue_date continua aparecendo.
      const all = await list({});
      assert.equal(all.total, 4);
      assert.deepEqual(labels(all.items), ['EARLY', 'LATE', 'NONE']);

      // Só issuedFrom.
      const fromOnly = await list({ issuedFrom: new Date('2026-04-01T00:00:00.000Z') });
      assert.equal(fromOnly.total, 1, 'só issuedFrom: issue_date >= issuedFrom');
      assert.deepEqual(labels(fromOnly.items), ['LATE']);

      // Só issuedTo — o filho ISS herda a emissão do documento.
      const toOnly = await list({ issuedTo: new Date('2026-04-01T00:00:00.000Z') });
      assert.equal(toOnly.total, 2, 'só issuedTo: pai + filho do EARLY');
      assert.deepEqual(labels(toOnly.items), ['EARLY']);
      assert.ok(toOnly.items.some((i) => i.kind === 'Child' && i.retentionType === 'ISS'));

      // Ambos, inclusivo nos extremos; NULL excluído.
      const both = await list({
        issuedFrom: new Date('2026-03-10T00:00:00.000Z'),
        issuedTo: new Date('2026-05-20T00:00:00.000Z'),
      });
      assert.equal(both.total, 3, 'intervalo inclusivo nos dois extremos');
      assert.deepEqual(labels(both.items), ['EARLY', 'LATE']);

      const wide = await list({ issuedFrom: new Date('2000-01-01T00:00:00.000Z') });
      assert.equal(wide.total, 3, 'NULL excluído com filtro de emissão ativo');
      assert.ok(wide.items.every((i) => i.issueDate !== null));

      // issuedFrom > issuedTo → vazio (a borda não valida a ordem; o SQL não casa nada).
      const inverted = await list({
        issuedFrom: new Date('2026-06-01T00:00:00.000Z'),
        issuedTo: new Date('2026-01-01T00:00:00.000Z'),
      });
      assert.equal(inverted.total, 0);

      // Vencimento: cada extremo vale SOZINHO, como no fake in-memory e no /documents. Antes era
      // `between` e um lado só era ignorado em silêncio — o /counts divergia do próprio `draft`.
      const dueFromOnly = await list({ dueFrom: new Date('2026-07-15T00:00:00.000Z') });
      assert.equal(dueFromOnly.total, 1, 'só dueFrom: due_date >= dueFrom');
      assert.deepEqual(labels(dueFromOnly.items), ['LATE']);
      const dueToOnly = await list({ dueTo: new Date('2026-07-15T00:00:00.000Z') });
      assert.equal(dueToOnly.total, 3, 'só dueTo: due_date <= dueTo');
      assert.deepEqual(labels(dueToOnly.items), ['EARLY', 'NONE']);
      const dueCounts = await view.countByStatus({
        supplierRef,
        dueFrom: new Date('2026-07-15T00:00:00.000Z'),
      });
      assert.equal(dueCounts.ok && dueCounts.value.total, 1, 'counts com só dueFrom == lista');

      // AND com dueFrom/dueTo.
      const andDue = await list({
        issuedFrom: new Date('2026-04-01T00:00:00.000Z'),
        dueFrom: new Date('2026-06-01T00:00:00.000Z'),
        dueTo: new Date('2026-07-15T00:00:00.000Z'),
      });
      assert.equal(andDue.total, 0, 'emissão AND vencimento');

      // counts concorda com a lista para o mesmo filtro de emissão.
      const filter = { supplierRef, issuedTo: new Date('2026-04-01T00:00:00.000Z') };
      const counts = await view.countByStatus(filter);
      assert.equal(counts.ok, true, JSON.stringify(counts));
      if (!counts.ok) return;
      assert.equal(counts.value.total, toOnly.total);
      assert.equal(counts.value.byStatus['Open'], 2);
    });
  });
}
