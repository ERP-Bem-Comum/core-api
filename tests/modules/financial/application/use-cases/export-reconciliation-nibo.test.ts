// W0 RED → W1 GREEN (#146 / FIN-RECON-EXPORT-CSV-NIBO) — use-case de export CSV-Nibo da conciliação.
// Enriquecimento (gathering): Reconciliation → doc (PayableDocumentView) → nomes (category/costCenter/
// supplier/cedente) → NiboExportRow[] → toNiboCsv. Fakes in-memory, sem Docker.
// Cobre os 3 caminhos (A lançamento / B manual #141 / C transferência #143) + CA5 (degradação) + CA6 (erros).

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok } from '#src/shared/primitives/result.ts';
import { createInMemoryPayableDocumentView } from '#src/modules/financial/adapters/persistence/repos/payable-document-view.in-memory.ts';
import { toNiboCsv } from '#src/modules/financial/adapters/export/nibo-csv.ts';
import type { PayableDocumentRow } from '#src/modules/financial/application/ports/payable-document-view.ts';
import type { ReconciliationPeriodStore } from '#src/modules/financial/application/ports/reconciliation-period-store.ts';
import type { BankStatementRepository } from '#src/modules/financial/application/ports/bank-statement-repository.ts';
import type { ReconciliationRepository } from '#src/modules/financial/application/ports/reconciliation-repository.ts';
import type { CategoryReadPort } from '#src/modules/financial/application/ports/category-read.ts';
import type { CostCenterReadPort } from '#src/modules/financial/application/ports/cost-center-read.ts';
import type { SupplierViewStore } from '#src/modules/financial/application/ports/supplier-view-store.ts';
import type { CedenteAccountStore } from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { ReconciliationPeriod } from '#src/modules/financial/domain/reconciliation/period.ts';
import type {
  Reconciliation,
  ReconciliationItem,
  ManualEntry,
  ManualEntryType,
} from '#src/modules/financial/domain/reconciliation/types.ts';
import type { StatementTransaction } from '#src/modules/financial/domain/statement/types.ts';
import type { Category } from '#src/modules/financial/domain/category/category.ts';
import type { CostCenter } from '#src/modules/financial/domain/cost-center/cost-center.ts';
import type { SupplierView } from '#src/modules/financial/domain/supplier-view/types.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';

import { exportReconciliationNibo } from '#src/modules/financial/application/use-cases/export-reconciliation-nibo.ts';

// ── helpers ──────────────────────────────────────────────────────────────────
const PERIOD_ID = '11111111-1111-4111-8111-111111111111';
const DEBIT_ACCOUNT = '22222222-2222-4222-8222-222222222222';
const ACC_DEST = '33333333-3333-4333-8333-333333333333';

const hasBom = (csv: string): boolean => csv.codePointAt(0) === 0xfeff;
const dataRows = (csv: string): string[][] =>
  (hasBom(csv) ? csv.slice(1) : csv)
    .trimEnd()
    .split('\r\n')
    .slice(1) // descarta o cabeçalho
    .map((line) => line.split(';'));

const makePeriod = (over: Partial<ReconciliationPeriod> = {}): ReconciliationPeriod =>
  ({
    debitAccountRef: DEBIT_ACCOUNT,
    periodStart: new Date('2026-03-01T00:00:00.000Z'),
    periodEnd: new Date('2026-03-31T00:00:00.000Z'),
    ...over,
  }) as unknown as ReconciliationPeriod;

const makeTx = (id: string, over: Partial<StatementTransaction> = {}): StatementTransaction =>
  ({
    id,
    fitid: `fit-${id}`,
    date: new Date('2026-03-12T00:00:00.000Z'),
    movement: 'Debit',
    entryType: 'Payment',
    payeeName: 'Banco',
    memo: 'Pagamento NF 123',
    valueCents: 200000,
    balanceAfterCents: 0,
    reconciliationStatus: 'Reconciled',
    ...over,
  }) as unknown as StatementTransaction;

const item = (payableId: string, reconciledValueCents: number): ReconciliationItem =>
  ({ payableId, reconciledValueCents }) as unknown as ReconciliationItem;

const makeReconciliation = (
  transactionId: string,
  over: Partial<Reconciliation> = {},
): Reconciliation =>
  ({
    id: `rec-${transactionId}`,
    transactionId,
    type: 'Individual',
    status: 'Active',
    items: [],
    difference: null,
    manualEntry: null,
    audit: {
      reconciledAt: new Date('2026-03-12T00:00:00.000Z'),
      reconciledBy: 'user-1',
      undoneAt: null,
      undoneBy: null,
      undoReason: null,
    },
    ...over,
  }) as unknown as Reconciliation;

const makeManualEntry = (type: ManualEntryType, over: Partial<ManualEntry> = {}): ManualEntry =>
  ({
    id: 'me-1',
    type,
    valueCents: 5000,
    supplierRef: null,
    categoryRef: null,
    costCenterRef: null,
    programRef: null,
    description: null,
    destinationAccountRef: null,
    productLabel: null,
    ...over,
  }) as unknown as ManualEntry;

const docRow = (payableId: string, over: Partial<PayableDocumentRow> = {}): PayableDocumentRow => ({
  payableId,
  documentId: `doc-${payableId}`,
  supplierRef: 'sup-1',
  documentNumber: 'NF-123',
  dueDate: new Date('2026-03-10T00:00:00.000Z'),
  categoryRef: 'cat-1',
  costCenterRef: 'cc-1',
  competencia: '2026-03',
  payeeKind: 'supplier',
  ...over,
});

const cat = (id: string, name: string): Category => ({ id, name }) as unknown as Category;
const costCenter = (id: string, name: string): CostCenter =>
  ({ id, name }) as unknown as CostCenter;
const supplier = (supplierRef: string, name: string): SupplierView =>
  ({
    supplierRef,
    name,
    document: '00000000000000',
    occurredAt: new Date(0),
  }) as unknown as SupplierView;
const cedente = (nickname: string | undefined): CedenteAccount =>
  ({ id: 'acc', nickname }) as unknown as CedenteAccount;

type Deps = Readonly<{
  period?: ReconciliationPeriod | null;
  txs?: readonly StatementTransaction[];
  reconciliations?: ReadonlyMap<string, Reconciliation>;
  docRows?: readonly PayableDocumentRow[];
  categories?: readonly Category[];
  costCenters?: readonly CostCenter[];
  suppliers?: ReadonlyMap<string, SupplierView>;
  accounts?: ReadonlyMap<string, CedenteAccount>;
}>;

const buildDeps = (cfg: Deps) => {
  const periodStore: Pick<ReconciliationPeriodStore, 'findById'> = {
    findById: () => Promise.resolve(ok(cfg.period ?? null)),
  };
  const statements: Pick<BankStatementRepository, 'listTransactionsByPeriod'> = {
    listTransactionsByPeriod: () => Promise.resolve(ok(cfg.txs ?? [])),
  };
  const reconciliationRepo: Pick<ReconciliationRepository, 'findActiveByTransaction'> = {
    findActiveByTransaction: (id) =>
      Promise.resolve(ok(cfg.reconciliations?.get(String(id)) ?? null)),
  };
  const categoryRead: CategoryReadPort = { list: () => Promise.resolve(ok(cfg.categories ?? [])) };
  const costCenterRead: CostCenterReadPort = {
    list: () => Promise.resolve(ok(cfg.costCenters ?? [])),
  };
  const supplierViewStore: Pick<SupplierViewStore, 'get'> = {
    get: (ref) => Promise.resolve(ok(cfg.suppliers?.get(ref) ?? null)),
  };
  const cedenteStore: Pick<CedenteAccountStore, 'findById'> = {
    findById: (id) => Promise.resolve(ok(cfg.accounts?.get(String(id)) ?? null)),
  };
  return {
    periodStore,
    statements,
    reconciliationRepo,
    payableDocView: createInMemoryPayableDocumentView(cfg.docRows ?? []),
    categoryRead,
    costCenterRead,
    supplierViewStore,
    cedenteStore,
    niboExporter: { export: toNiboCsv },
  };
};

const run = async (cfg: Deps, periodId = PERIOD_ID): Promise<Result<{ content: string }, string>> =>
  exportReconciliationNibo(buildDeps(cfg))({ periodId });

const baseCfg = (over: Partial<Deps> = {}): Deps => ({
  period: makePeriod(),
  categories: [cat('cat-1', 'Outras despesas')],
  costCenters: [costCenter('cc-1', 'Financeiro')],
  suppliers: new Map([['sup-1', supplier('sup-1', 'Fornecedor Alfa')]]),
  accounts: new Map([[DEBIT_ACCOUNT, cedente('Itaú')]]),
  ...over,
});

// ── testes ───────────────────────────────────────────────────────────────────
describe('financial/application — exportReconciliationNibo (#146)', () => {
  it('A: lançamento de título conciliado → 1 linha com nomes resolvidos e sinal negativo (Debit)', async () => {
    const tx = makeTx('tx-1');
    const rec = makeReconciliation('tx-1', { items: [item('pay-1', 200000)] });
    const r = await run(
      baseCfg({ txs: [tx], reconciliations: new Map([['tx-1', rec]]), docRows: [docRow('pay-1')] }),
    );
    assert.ok(r.ok);
    const rows = dataRows(r.value.content);
    assert.equal(rows.length, 1);
    const c = rows[0]!;
    assert.equal(c[0], 'Lançamento');
    assert.equal(c[1], 'Fornecedor Alfa'); // contato resolvido (supplier-view)
    assert.equal(c[3], 'Outras despesas'); // categoria resolvida
    assert.equal(c[4], '-2000,00'); // Debit → negativo
    assert.equal(c[5], '10/03/2026'); // vencimento (doc.dueDate)
    assert.equal(c[7], '01/03/2026'); // competência YYYY-MM → 1º dia
    assert.equal(c[8], 'Financeiro'); // centro de custo resolvido
    assert.equal(c[10], 'Fornecedor'); // payeeKind=supplier → Fornecedor
    assert.equal(c[11], 'NF-123'); // referência = documentNumber
    assert.equal(c[12], 'Itaú'); // conta = apelido da cedente do período
    assert.equal(c[13], '12/03/2026'); // data pag = tx.date
  });

  it('A: conciliação com N títulos → N linhas (1 por item), cada uma com sua categoria/valor', async () => {
    const tx = makeTx('tx-2', { valueCents: 300000 });
    const rec = makeReconciliation('tx-2', {
      type: 'Multiple',
      items: [item('pay-1', 200000), item('pay-2', 100000)],
    });
    const r = await run(
      baseCfg({
        txs: [tx],
        reconciliations: new Map([['tx-2', rec]]),
        docRows: [
          docRow('pay-1', { documentNumber: 'NF-1' }),
          docRow('pay-2', { documentNumber: 'NF-2', categoryRef: 'cat-2' }),
        ],
        categories: [cat('cat-1', 'Outras despesas'), cat('cat-2', 'Serviços')],
      }),
    );
    assert.ok(r.ok);
    const rows = dataRows(r.value.content);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]![4], '-2000,00');
    assert.equal(rows[1]![4], '-1000,00');
    assert.equal(rows[1]![3], 'Serviços');
  });

  it('A: Credit → valor positivo (recebimento), sem sinal de menos', async () => {
    const tx = makeTx('tx-3', { movement: 'Credit', valueCents: 100000 });
    const rec = makeReconciliation('tx-3', { items: [item('pay-1', 100000)] });
    const r = await run(
      baseCfg({ txs: [tx], reconciliations: new Map([['tx-3', rec]]), docRows: [docRow('pay-1')] }),
    );
    assert.ok(r.ok);
    assert.equal(dataRows(r.value.content)[0]![4], '1000,00');
  });

  it('B: manual classificado #141 (FeePenaltyInterest) → 1 linha Lançamento com categoria/centro do manualEntry', async () => {
    const tx = makeTx('tx-4', { valueCents: 5000, memo: 'Tarifa bancária' });
    const rec = makeReconciliation('tx-4', {
      type: 'ManualEntry',
      manualEntry: makeManualEntry('FeePenaltyInterest', {
        valueCents: 5000,
        categoryRef: 'cat-9',
        costCenterRef: 'cc-9',
        description: 'Tarifa DOC',
      }),
    });
    const r = await run(
      baseCfg({
        txs: [tx],
        reconciliations: new Map([['tx-4', rec]]),
        categories: [cat('cat-9', 'Despesas bancárias')],
        costCenters: [costCenter('cc-9', 'Administrativo')],
      }),
    );
    assert.ok(r.ok);
    const rows = dataRows(r.value.content);
    assert.equal(rows.length, 1);
    const c = rows[0]!;
    assert.equal(c[0], 'Lançamento');
    assert.equal(c[3], 'Despesas bancárias'); // categoria do manualEntry
    assert.equal(c[4], '-50,00'); // Debit → negativo
    assert.equal(c[8], 'Administrativo'); // centro do manualEntry
    assert.equal(c[11], ''); // sem documento → referência vazia
  });

  it('C: transferência #143 (Transfer) → 1 linha Transferência com Conta = apelido da conta destino', async () => {
    const tx = makeTx('tx-5', { valueCents: 50000, movement: 'Credit' });
    const rec = makeReconciliation('tx-5', {
      type: 'ManualEntry',
      manualEntry: makeManualEntry('Transfer', {
        valueCents: 50000,
        destinationAccountRef: ACC_DEST,
      }),
    });
    const r = await run(
      baseCfg({
        txs: [tx],
        reconciliations: new Map([['tx-5', rec]]),
        accounts: new Map([
          [DEBIT_ACCOUNT, cedente('Itaú')],
          [ACC_DEST, cedente('Bradesco')],
        ]),
      }),
    );
    assert.ok(r.ok);
    const rows = dataRows(r.value.content);
    assert.equal(rows.length, 1);
    const c = rows[0]!;
    assert.equal(c[0], 'Transferência');
    assert.equal(c[1], ''); // sem contato
    assert.equal(c[3], ''); // sem categoria
    assert.equal(c[10], ''); // sem tipo de contato
    assert.equal(c[12], 'Bradesco'); // conta destino
    assert.equal(c[4], '500,00');
  });

  it('C: aplicação #143 (Investment) → Transferência com Conta = productLabel', async () => {
    const tx = makeTx('tx-6', { valueCents: 80000 });
    const rec = makeReconciliation('tx-6', {
      type: 'ManualEntry',
      manualEntry: makeManualEntry('Investment', {
        valueCents: 80000,
        productLabel: 'CDB Liquidez',
      }),
    });
    const r = await run(baseCfg({ txs: [tx], reconciliations: new Map([['tx-6', rec]]) }));
    assert.ok(r.ok);
    const c = dataRows(r.value.content)[0]!;
    assert.equal(c[0], 'Transferência');
    assert.equal(c[12], 'CDB Liquidez');
  });

  it('CA5: refs não resolvíveis → células vazias (degradação graciosa, sem erro)', async () => {
    const tx = makeTx('tx-7');
    const rec = makeReconciliation('tx-7', { items: [item('pay-x', 200000)] });
    const r = await run(
      baseCfg({
        txs: [tx],
        reconciliations: new Map([['tx-7', rec]]),
        docRows: [
          docRow('pay-x', {
            supplierRef: 'sup-desconhecido',
            categoryRef: 'cat-desconhecida',
            costCenterRef: null,
          }),
        ],
        suppliers: new Map(), // vazio
        categories: [], // vazio
      }),
    );
    assert.ok(r.ok);
    const c = dataRows(r.value.content)[0]!;
    assert.equal(c[1], ''); // contato não resolvido
    assert.equal(c[3], ''); // categoria não resolvida
    assert.equal(c[8], ''); // centro de custo null
  });

  it('CA6: período inexistente → erro mapeado (sem 5xx)', async () => {
    const r = await run(baseCfg({ period: null }));
    assert.ok(!r.ok);
    assert.equal(r.error, 'reconciliation-period-not-found');
  });

  it('CA6: periodId inválido → erro mapeado', async () => {
    const r = await run(baseCfg(), 'not-a-uuid');
    assert.ok(!r.ok);
    assert.equal(r.error, 'reconciliation-period-id-invalid');
  });

  it('transação Pending (não conciliada) é ignorada — não gera linha', async () => {
    const pending = makeTx('tx-8', { reconciliationStatus: 'Pending' });
    const reconciled = makeTx('tx-9');
    const rec = makeReconciliation('tx-9', { items: [item('pay-1', 200000)] });
    const r = await run(
      baseCfg({
        txs: [pending, reconciled],
        reconciliations: new Map([['tx-9', rec]]),
        docRows: [docRow('pay-1')],
      }),
    );
    assert.ok(r.ok);
    assert.equal(dataRows(r.value.content).length, 1);
  });
});
