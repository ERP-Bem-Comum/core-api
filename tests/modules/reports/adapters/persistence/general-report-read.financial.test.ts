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
} from '#src/modules/partners/public-api/index.ts';

const NOW = new Date('2026-07-14T12:00:00.000Z');

// Linha PLANA do financial (só payeeKind + supplierRef; sem nomes cross-módulo — vêm do stitch).
const finRow = (over: Partial<FinancialRow> = {}): FinancialRow => ({
  payableId: 'f1000000-0000-4000-8000-0000000000f1',
  documentId: 'dc000000-0000-4000-8000-00000000d001',
  code: 'NFS 1234',
  tipo: 'a-pagar',
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
const makeContractorRead = (
  financiers: Readonly<Record<string, StubOutcome<FinancierView>>>,
  collaborators: Readonly<Record<string, StubOutcome<CollaboratorView>>>,
): {
  port: Pick<ContractorReadPort, 'getFinancierView' | 'getCollaboratorView'>;
  financierCalls: string[];
  collaboratorCalls: string[];
} => {
  const financierCalls: string[] = [];
  const collaboratorCalls: string[] = [];
  const resolve = <V>(o: StubOutcome<V> | undefined): Result<V | null, ContractorReadError> => {
    if (o === undefined || o.kind === 'null') return ok(null);
    if (o.kind === 'err') return err('contractor-read-unavailable');
    return ok(o.value);
  };
  return {
    financierCalls,
    collaboratorCalls,
    port: {
      getFinancierView: (id) => {
        financierCalls.push(id);
        return Promise.resolve(resolve(financiers[id]));
      },
      getCollaboratorView: (id) => {
        collaboratorCalls.push(id);
        return Promise.resolve(resolve(collaborators[id]));
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
        finRow({ payableId: 'p-fin', payeeKind: 'financier', supplierRef: FIN }),
        finRow({ payableId: 'p-col', payeeKind: 'collaborator', supplierRef: COL }),
      ]),
      port,
    );

    const r = await adapter.list({}, { page: 1, limit: 50 });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    const [fin, col] = r.value.items;
    assert.equal(fin!.financierName, 'Financiador BNDES');
    assert.equal(fin!.collaboratorName, null);
    assert.equal(col!.collaboratorName, 'Colaborador João');
    assert.equal(col!.financierName, null);
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
    );

    const r = await adapter.list({}, { page: 1, limit: 50 });
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
    );

    const r = await adapter.list({}, { page: 1, limit: 50 });
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
    );

    const r = await adapter.list({}, { page: 1, limit: 50 });
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
    );

    const r = await adapter.list({}, { page: 1, limit: 50 });
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
    );

    const r = await adapter.list({}, { page: 1, limit: 50 });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'general-report-read-unavailable');
  });
});
