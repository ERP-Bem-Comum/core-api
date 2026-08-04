/**
 * REPORTS-GENERAL-REPORT (REP-6 · #442 · Slice B) — W0 RED · o STITCH cross-módulo.
 *
 * Testa `GeneralReportReadFromFinancial(listReport, contractorRead)` — o adapter que costura os
 * NOMES de Financiador/Colaborador (cross-módulo, via partners public-api) sobre as linhas planas
 * do `financial`. O financial só entrega `payeeKind` + `supplierRef` (o ref do favorecido); o nome
 * é resolvido AQUI, por kind, com:
 *   - DEDUPE: cada ref resolvido UMA vez (Map<ref,nome>) — espião conta as chamadas ao partners;
 *   - DEGRADAÇÃO GRACIOSA: getter → err ou null ⇒ nome null (a página ainda vem ok);
 *   - supplier/act NÃO chamam partners (nome do fornecedor é local; act não tem coluna de nome).
 * Só propaga erro se o próprio `listReport` falhar.
 *
 * Funções puras + fakes (zero DB) → roda no `pnpm test` puro. RED enquanto o adapter ainda recebe
 * um único dep (Slice A) e não faz stitch.
 *
 * Código EN, comentários PT-BR.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import { GeneralReportReadFromFinancial } from '#src/modules/reports/adapters/persistence/general-report-read.financial.ts';
import type {
  GeneralReportReader,
  GeneralReportRow as FinancialRow,
} from '#src/modules/financial/public-api/index.ts';
import type {
  ContractorReadPort,
  ContractorReadError,
  FinancierView,
  CollaboratorView,
  SupplierView,
  BankAccount,
  PixKey,
} from '#src/modules/partners/public-api/index.ts';
import type { ContractNumberReadPort } from '#src/modules/contracts/public-api/index.ts';

const NOW = new Date('2026-07-14T12:00:00.000Z');

// Linha PLANA do financial (só payeeKind + supplierRef; sem nomes cross-módulo — vêm do stitch).
const finRow = (over: Partial<FinancialRow> = {}): FinancialRow => ({
  payableId: 'f1000000-0000-4000-8000-0000000000f1',
  documentId: 'dc000000-0000-4000-8000-00000000d001',
  code: 'NFS 1234',
  tipo: 'a-pagar',
  status: 'Approved',
  dueDate: '2026-07-01',
  payeeKind: 'supplier',
  supplierRef: null,
  supplierName: null,
  costCenterRef: null,
  costCenterName: null,
  categoryRef: null,
  categoryName: null,
  subcategoryRef: null,
  subcategoryName: null,
  valueCents: 1000,
  contractRef: null,
  ...over,
});

const financierView = (id: string, name: string): FinancierView => ({
  type: 'financier',
  id,
  name,
  document: '11222333000181',
  corporateName: name,
  legalRepresentative: 'Rep Legal',
  telephone: '11999999999',
  address: 'Rua X, 1',
  updatedAt: NOW,
});

const collaboratorView = (id: string, name: string): CollaboratorView => ({
  type: 'collaborator',
  id,
  name,
  email: 'c@x.org',
  document: '12345678901',
  role: 'Analista',
  occupationArea: 'Financeiro',
  updatedAt: NOW,
});

const BANK: BankAccount = {
  bank: '237',
  agency: '1234',
  accountNumber: '567890',
  checkDigit: '1',
};
const PIX: PixKey = { keyType: 'cnpj', key: '11222333000181' };

const supplierView = (
  id: string,
  over: Partial<Pick<SupplierView, 'bankAccount' | 'pixKey'>> = {},
): SupplierView => ({
  type: 'supplier',
  id,
  name: 'Fornecedor Alpha',
  email: 's@x.org',
  document: '11222333000181',
  serviceCategory: 'BANCO',
  bankAccount: over.bankAccount ?? BANK,
  pixKey: over.pixKey ?? PIX,
  updatedAt: NOW,
});

// Slice D (#442): fake do read port de NÚMERO do contrato (contracts public-api). Conta as chamadas
// (para provar a costura em LOTE — 1 por página), filtra o seed pelos ids, e sabe degradar (`err`).
const makeContractNumberRead = (
  seed: Readonly<Record<string, string>> = {},
  mode: 'ok' | 'err' = 'ok',
): {
  resolveContractNumbers: ContractNumberReadPort['resolveContractNumbers'];
  calls: string[][];
} => {
  const calls: string[][] = [];
  return {
    calls,
    resolveContractNumbers: (ids) => {
      calls.push([...ids]);
      if (mode === 'err') return Promise.resolve(err('contract-number-read-unavailable'));
      const out = new Map<string, string>();
      for (const id of ids) {
        const num = seed[id];
        if (num !== undefined) out.set(id, num);
      }
      return Promise.resolve(ok<ReadonlyMap<string, string>>(out));
    },
  };
};
// Resolver neutro (Map sempre vazio) para os testes de Slice B/C que não exercitam o número.
const noNumbers = makeContractNumberRead().resolveContractNumbers;

// Fake reader do financial (Slice A): devolve página fixa; conta as chamadas.
const fakeListReport =
  (items: readonly FinancialRow[]): GeneralReportReader['list'] =>
  (_filter, pagination) =>
    Promise.resolve(
      ok({
        items: [...items],
        page: pagination.page,
        pageSize: pagination.limit,
        total: items.length,
      }),
    );

// Fake ContractorReadPort com espião de contagem por getter. Devolve `null`/`err` conforme o mapa.
type StubOutcome<V> = { kind: 'ok'; value: V } | { kind: 'null' } | { kind: 'err' };
// Slice C: o adapter agora depende também de `getSupplierView` (PIX/banco). O stub de supplier é
// opcional para não perturbar os testes de Slice B (só nomes) que passam `{}`.
const makeContractorRead = (
  financiers: Readonly<Record<string, StubOutcome<FinancierView>>>,
  collaborators: Readonly<Record<string, StubOutcome<CollaboratorView>>>,
  suppliers: Readonly<Record<string, StubOutcome<SupplierView>>> = {},
): {
  port: Pick<ContractorReadPort, 'getFinancierView' | 'getCollaboratorView' | 'getSupplierView'>;
  financierCalls: string[];
  collaboratorCalls: string[];
  supplierCalls: string[];
} => {
  const financierCalls: string[] = [];
  const collaboratorCalls: string[] = [];
  const supplierCalls: string[] = [];
  const resolve = <V>(o: StubOutcome<V> | undefined): Result<V | null, ContractorReadError> => {
    if (o === undefined || o.kind === 'null') return ok(null);
    if (o.kind === 'err') return err('contractor-read-unavailable');
    return ok(o.value);
  };
  return {
    financierCalls,
    collaboratorCalls,
    supplierCalls,
    port: {
      getFinancierView: (id) => {
        financierCalls.push(id);
        return Promise.resolve(resolve(financiers[id]));
      },
      getCollaboratorView: (id) => {
        collaboratorCalls.push(id);
        return Promise.resolve(resolve(collaborators[id]));
      },
      getSupplierView: (id) => {
        supplierCalls.push(id);
        return Promise.resolve(resolve(suppliers[id]));
      },
    },
  };
};

describe('GeneralReportReadFromFinancial — stitch de Financiador/Colaborador (REP-6 · #442 · Slice B)', () => {
  it('costura o nome por kind: financier→financierName, collaborator→collaboratorName', async () => {
    const FIN = 'e1000000-0000-4000-8000-0000000000e1';
    const COL = 'e2000000-0000-4000-8000-0000000000e2';
    const { port } = makeContractorRead(
      { [FIN]: { kind: 'ok', value: financierView(FIN, 'Financiador BNDES') } },
      { [COL]: { kind: 'ok', value: collaboratorView(COL, 'Colaborador João') } },
    );
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({
          payableId: 'p-fin',
          payeeKind: 'financier',
          supplierRef: FIN,
          status: 'Reconciled',
        }),
        finRow({ payableId: 'p-col', payeeKind: 'collaborator', supplierRef: COL }),
      ]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    const [fin, col] = r.value.items;
    assert.equal(fin!.financierName, 'Financiador BNDES');
    assert.equal(fin!.collaboratorName, null);
    assert.equal(col!.collaboratorName, 'Colaborador João');
    assert.equal(col!.financierName, null);
    // #611: o displayStatus do financial atravessa o stitch sem alteração.
    assert.equal(fin!.status, 'Reconciled');
    assert.equal(col!.status, 'Approved');
  });

  it('DEDUPE: o mesmo ref repetido é resolvido só 1× por getter', async () => {
    const FIN = 'e1000000-0000-4000-8000-0000000000e1';
    const { port, financierCalls } = makeContractorRead(
      { [FIN]: { kind: 'ok', value: financierView(FIN, 'Financiador BNDES') } },
      {},
    );
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'financier', supplierRef: FIN }),
        finRow({ payableId: 'p2', payeeKind: 'financier', supplierRef: FIN }),
        finRow({ payableId: 'p3', payeeKind: 'financier', supplierRef: FIN }),
      ]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(financierCalls.length, 1, 'ref resolvido uma única vez (dedupe)');
    for (const line of r.value.items) assert.equal(line.financierName, 'Financiador BNDES');
  });

  it('DEGRADAÇÃO GRACIOSA: getter → err ⇒ nome null, página ainda ok', async () => {
    const FIN = 'e1000000-0000-4000-8000-0000000000e1';
    const { port } = makeContractorRead({ [FIN]: { kind: 'err' } }, {});
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([finRow({ payableId: 'p1', payeeKind: 'financier', supplierRef: FIN })]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, 'err do partners NÃO derruba o relatório');
    if (!r.ok) return;
    assert.equal(r.value.items[0]!.financierName, null);
  });

  it('DEGRADAÇÃO GRACIOSA: getter → null ⇒ nome null (ref inexistente)', async () => {
    const COL = 'e2000000-0000-4000-8000-0000000000e2';
    const { port } = makeContractorRead({}, { [COL]: { kind: 'null' } });
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([finRow({ payableId: 'p1', payeeKind: 'collaborator', supplierRef: COL })]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.items[0]!.collaboratorName, null);
  });

  it('supplier/act NÃO chamam partners; nomes cross-módulo null', async () => {
    const { port, financierCalls, collaboratorCalls } = makeContractorRead({}, {});
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({
          payableId: 'p-sup',
          payeeKind: 'supplier',
          supplierRef: '11111111-1111-4111-8111-111111111111',
          supplierName: 'Fornecedor Alpha',
        }),
        finRow({
          payableId: 'p-act',
          payeeKind: 'act',
          supplierRef: '99999999-9999-4999-8999-999999999999',
        }),
      ]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(financierCalls.length, 0, 'supplier/act não chamam getFinancierView');
    assert.equal(collaboratorCalls.length, 0, 'supplier/act não chamam getCollaboratorView');
    const [sup, act] = r.value.items;
    assert.equal(sup!.supplierName, 'Fornecedor Alpha');
    assert.equal(sup!.financierName, null);
    assert.equal(sup!.collaboratorName, null);
    assert.equal(act!.financierName, null);
    assert.equal(act!.collaboratorName, null);
  });

  it('propaga erro só quando o próprio listReport falha', async () => {
    const { port } = makeContractorRead({}, {});
    const adapter = GeneralReportReadFromFinancial(
      () => Promise.resolve(err('general-report-read-failure')),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'general-report-read-unavailable');
  });
});

// Slice C (#442): PIX + Dados Bancários costurados de `getSupplierView`, só para linhas supplier,
// com dedupe por ref, degradação graciosa e gate `includeBankData`.
describe('GeneralReportReadFromFinancial — stitch de PIX/Bancários (REP-6 · #442 · Slice C)', () => {
  const SUP = '11111111-1111-4111-8111-111111111111';
  const FIN = 'e1000000-0000-4000-8000-0000000000e1';

  it('resolve PIX/banco só para supplier (financier/collaborator/act → null)', async () => {
    const { port, supplierCalls, financierCalls } = makeContractorRead(
      { [FIN]: { kind: 'ok', value: financierView(FIN, 'Financiador BNDES') } },
      {},
      { [SUP]: { kind: 'ok', value: supplierView(SUP) } },
    );
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p-sup', payeeKind: 'supplier', supplierRef: SUP }),
        finRow({ payableId: 'p-fin', payeeKind: 'financier', supplierRef: FIN }),
        finRow({
          payableId: 'p-act',
          payeeKind: 'act',
          supplierRef: '99999999-9999-4999-8999-999999999999',
        }),
      ]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: true });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    const [sup, fin, act] = r.value.items;
    assert.deepEqual(sup!.pixKey, PIX);
    assert.deepEqual(sup!.bankAccount, BANK);
    // financier/act: PIX/banco sempre null (nem chama getSupplierView para eles).
    assert.equal(fin!.pixKey, null);
    assert.equal(fin!.bankAccount, null);
    assert.equal(act!.pixKey, null);
    assert.equal(act!.bankAccount, null);
    assert.deepEqual(supplierCalls, [SUP], 'só a linha supplier chama getSupplierView');
    assert.equal(financierCalls.length, 1, 'financier ainda resolve nome (independe de banco)');
  });

  it('DEDUPE: o mesmo supplierRef é resolvido só 1× (getSupplierView)', async () => {
    const { port, supplierCalls } = makeContractorRead(
      {},
      {},
      { [SUP]: { kind: 'ok', value: supplierView(SUP) } },
    );
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP }),
        finRow({ payableId: 'p2', payeeKind: 'supplier', supplierRef: SUP }),
        finRow({ payableId: 'p3', payeeKind: 'supplier', supplierRef: SUP }),
      ]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: true });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(supplierCalls.length, 1, 'ref resolvido uma única vez (dedupe)');
    for (const line of r.value.items) {
      assert.deepEqual(line.pixKey, PIX);
      assert.deepEqual(line.bankAccount, BANK);
    }
  });

  it('DEGRADAÇÃO GRACIOSA: getSupplierView err/null ⇒ PIX/banco null, página ainda ok', async () => {
    const OTHER = '22222222-2222-4222-8222-222222222222';
    const { port } = makeContractorRead(
      {},
      {},
      { [SUP]: { kind: 'err' }, [OTHER]: { kind: 'null' } },
    );
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP }),
        finRow({ payableId: 'p2', payeeKind: 'supplier', supplierRef: OTHER }),
      ]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: true });
    assert.equal(r.ok, true, 'err/null do partners NÃO derruba o relatório');
    if (!r.ok) return;
    for (const line of r.value.items) {
      assert.equal(line.pixKey, null);
      assert.equal(line.bankAccount, null);
    }
  });

  it('GATE: includeBankData=false ⇒ NÃO chama getSupplierView e zera PIX/banco', async () => {
    const { port, supplierCalls } = makeContractorRead(
      {},
      {},
      { [SUP]: { kind: 'ok', value: supplierView(SUP) } },
    );
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP })]),
      port,
      noNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(supplierCalls.length, 0, 'redigido: nem busca o supplier no partners');
    assert.equal(r.value.items[0]!.pixKey, null);
    assert.equal(r.value.items[0]!.bankAccount, null);
  });
});

// Slice D (#442): NÚMERO do contrato costurado de `resolveContractNumbers` (contracts public-api),
// a partir do `contractRef` (UUID). Batch (1 chamada por página), dedupe, degradação graciosa e
// `contractRef: null` → `contractNumber: null` sem custo.
describe('GeneralReportReadFromFinancial — stitch do Número do Contrato (REP-6 · #442 · Slice D)', () => {
  const SUP = '11111111-1111-4111-8111-111111111111';
  const CTR_1 = 'c1000000-0000-4000-8000-0000000000c1';
  const CTR_2 = 'c2000000-0000-4000-8000-0000000000c2';

  const noContractors: Pick<
    ContractorReadPort,
    'getFinancierView' | 'getCollaboratorView' | 'getSupplierView'
  > = makeContractorRead({}, {}).port;

  it('costura o número por contractRef (map.get(ref))', async () => {
    const { resolveContractNumbers } = makeContractNumberRead({
      [CTR_1]: 'CT-2026-0001',
      [CTR_2]: 'CT-2026-0002',
    });
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_1 }),
        finRow({ payableId: 'p2', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_2 }),
      ]),
      noContractors,
      resolveContractNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    const [a, b] = r.value.items;
    assert.equal(a!.contractNumber, 'CT-2026-0001');
    assert.equal(b!.contractNumber, 'CT-2026-0002');
  });

  it('BATCH + DEDUPE: refs distintos → 1 chamada; ids repetidos não duplicam no IN', async () => {
    const { resolveContractNumbers, calls } = makeContractNumberRead({
      [CTR_1]: 'CT-2026-0001',
      [CTR_2]: 'CT-2026-0002',
    });
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_1 }),
        finRow({ payableId: 'p2', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_1 }),
        finRow({ payableId: 'p3', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_2 }),
        finRow({ payableId: 'p4', payeeKind: 'supplier', supplierRef: SUP, contractRef: null }),
      ]),
      noContractors,
      resolveContractNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(calls.length, 1, 'uma única chamada por página (batch)');
    // Refs distintos não-nulos, sem duplicata (p1 e p2 compartilham CTR_1; p4 é null → fora).
    assert.deepEqual([...calls[0]!].sort(), [CTR_1, CTR_2].sort());
    const [a, b, c, d] = r.value.items;
    assert.equal(a!.contractNumber, 'CT-2026-0001');
    assert.equal(b!.contractNumber, 'CT-2026-0001');
    assert.equal(c!.contractNumber, 'CT-2026-0002');
    assert.equal(d!.contractNumber, null);
  });

  it('DEGRADAÇÃO GRACIOSA: resolveContractNumbers → err ⇒ TODOS null, página ainda ok', async () => {
    const { resolveContractNumbers } = makeContractNumberRead({ [CTR_1]: 'CT-2026-0001' }, 'err');
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_1 }),
        finRow({ payableId: 'p2', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_2 }),
      ]),
      noContractors,
      resolveContractNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, 'err do contracts NÃO derruba o relatório');
    if (!r.ok) return;
    for (const line of r.value.items) assert.equal(line.contractNumber, null);
  });

  it('contractRef null → contractNumber null (e não entra no IN)', async () => {
    const { resolveContractNumbers, calls } = makeContractNumberRead({});
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP, contractRef: null }),
      ]),
      noContractors,
      resolveContractNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.items[0]!.contractNumber, null);
    assert.deepEqual(calls[0], [], 'nenhum ref não-nulo → IN vazio');
  });

  it('ref sem número no Map → contractNumber null (degradação por linha)', async () => {
    const { resolveContractNumbers } = makeContractNumberRead({ [CTR_1]: 'CT-2026-0001' });
    const adapter = GeneralReportReadFromFinancial(
      fakeListReport([
        finRow({ payableId: 'p1', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_1 }),
        finRow({ payableId: 'p2', payeeKind: 'supplier', supplierRef: SUP, contractRef: CTR_2 }),
      ]),
      noContractors,
      resolveContractNumbers,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 }, { includeBankData: false });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.equal(r.value.items[0]!.contractNumber, 'CT-2026-0001');
    assert.equal(r.value.items[1]!.contractNumber, null, 'ref ausente no Map → null');
  });
});
