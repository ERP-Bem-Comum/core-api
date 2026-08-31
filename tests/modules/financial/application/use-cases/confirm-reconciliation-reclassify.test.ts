// M2 — a reclassificação no `confirmReconciliation` (camada de orquestração).
//
// O que esta suíte prova, e a de domínio não podia:
//
//   RN-M2-06  — a reclassificação chega ao repo NA MESMA chamada de `confirm`, não numa escrita à
//               parte. É o que a atomicidade exige, e o único ponto onde dá para observá-lo sem MySQL.
//   RN-M2-09  — caminho incoerente com a árvore do plano é recusado (M2-9).
//   RN-M2-10  — nó DESATIVADO entre a leitura da tela e o confirm é recusado (M2-10).
//   RN-M2-11  — seleção só de impostos não habilita reclassificação (M2-7).
//   RN-M2-07  — trilha com de→para, no pai E em cada filho.
//   M2-8      — seleção mista: o pai reclassifica, o imposto entra por cascata.
//   Inv. 6    — mesmo valor → sem entrada de trilha.
//
// E o que ela prova por AUSÊNCIA: sem `taxonomy` no input, nenhuma reclassificação viaja — a M2 não
// muda o caminho de quem só concilia.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, type Result } from '#src/shared/primitives/result.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import type { ReconciliationReclassification } from '#src/modules/financial/application/ports/reconciliation-repository.ts';
import type { PayableDocumentRow } from '#src/modules/financial/application/ports/payable-document-view.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import type { OpenDocument } from '#src/modules/financial/domain/document/types.ts';
import type { Payables } from '#src/modules/financial/domain/payable/types.ts';
import { fromCents } from '#src/shared/kernel/money.ts';
import { taxonomyPathsOf } from '#tests/support/reconciliation-m2-deps.ts';

const PROGRAM = '11111111-1111-4111-8111-111111111111';
const PLAN = '22222222-2222-4222-8222-222222222222';
const COST_CENTER = '33333333-3333-4333-8333-333333333333';
const CATEGORY = '44444444-4444-4444-8444-444444444444';
const SUBCATEGORY = '55555555-5555-4555-8555-555555555555';
const TX_ID = '00000000-0000-4000-8000-0000000000aa';
const ACCOUNT_REF = '77777777-7777-4777-8777-777777777777';
const USER = '99999999-9999-4999-8999-999999999999';

const TAXONOMY_INPUT = {
  programRef: PROGRAM,
  budgetPlanRef: PLAN,
  costCenterRef: COST_CENTER,
  categoryRef: CATEGORY,
  subcategoryRef: SUBCATEGORY,
};

const VALID_PATH = { ...TAXONOMY_INPUT, active: true };

const money = (cents: number) => {
  const m = fromCents(cents);
  if (!m.ok) throw new Error('setup: money');
  return m.value;
};

const documentId = DocumentId.generate();
const parentId = PayableId.generate();
const childId = PayableId.generate();
const dueDate = new Date('2026-09-10T00:00:00.000Z');

const openDocument = {
  id: documentId,
  documentNumber: 'NF-M2-002',
  series: null,
  type: 'NFS-e',
  supplier: '66666666-6666-4666-8666-666666666666',
  payeeKind: 'supplier',
  contractRef: null,
  budgetPlanRef: null,
  categoryRef: '88888888-8888-4888-8888-888888888888',
  subcategoryRef: null,
  costCenterRef: null,
  programRef: null,
  paymentMethod: 'PIX',
  grossValue: money(100_000),
  sourceDiscounts: money(0),
  retentions: [],
  registeredTaxes: [],
  discounts: money(0),
  penalty: money(0),
  interest: money(0),
  netValue: money(95_000),
  description: null,
  dueDate,
  issueDate: null,
  approverRef: null,
  accessKey: null,
  competencia: null,
  debitAccountRef: null,
  paymentDetail: null,
  sourceFileRef: null,
  status: 'Open',
} as unknown as OpenDocument;

const payables = {
  parent: {
    id: parentId,
    origin: documentId,
    kind: 'Parent',
    retentionType: null,
    status: 'Paid',
    value: money(95_000),
    dueDate,
    paymentMethod: 'PIX',
    paymentDetail: null,
    paidAt: dueDate,
  },
  children: [
    {
      id: childId,
      origin: documentId,
      kind: 'Child',
      retentionType: 'ISS',
      status: 'Paid',
      value: money(5_000),
      dueDate: new Date('2026-10-15T00:00:00.000Z'),
      paymentMethod: 'GuiaRecolhimento',
      paymentDetail: null,
      paidAt: null,
    },
  ],
} as unknown as Payables;

const docRow = (payableId: string, kind: 'Parent' | 'Child'): PayableDocumentRow => ({
  payableId,
  documentId: String(documentId),
  kind,
  supplierRef: null,
  documentNumber: 'NF-M2-002',
  dueDate: null,
  categoryRef: '88888888-8888-4888-8888-888888888888',
  costCenterRef: null,
  budgetPlanRef: null,
  subcategoryRef: null,
  programRef: null,
  competencia: null,
  payeeKind: null,
});

interface Captured {
  reclassifications: readonly ReconciliationReclassification[] | undefined;
}

const buildDeps = (
  cap: Captured,
  opts: {
    rows?: readonly PayableDocumentRow[];
    paths?: readonly (typeof VALID_PATH)[];
  } = {},
) => {
  // Conta ABERTA: o guard FR-015 é de outra suíte — aqui ela só não pode barrar o caminho.
  const account = { id: ACCOUNT_REF, status: 'Active' } as never;

  return {
    reconciliationRepo: {
      confirm: (
        _recon: unknown,
        _txId: unknown,
        _events?: unknown,
        reclassifications?: readonly ReconciliationReclassification[],
      ): Promise<Result<void, never>> => {
        cap.reclassifications = reclassifications;
        return Promise.resolve(ok(undefined));
      },
    },
    payables: {
      findSnapshotsByIds: (ids: readonly string[]) =>
        Promise.resolve(
          ok(
            ids.map((id) => ({
              id: PayableId.rehydrate(id).ok
                ? (PayableId.rehydrate(id) as { value: unknown }).value
                : id,
              status: 'Paid',
              valueCents: id === String(parentId) ? 95_000 : 5_000,
            })),
          ),
        ),
    },
    statements: {
      findTransaction: () =>
        Promise.resolve(
          ok({
            transaction: {
              id: TX_ID,
              valueCents: opts.rows?.length === 1 ? 5_000 : 100_000,
              date: dueDate,
              reconciliationStatus: 'Pending',
            },
            debitAccountRef: ACCOUNT_REF,
          }),
        ),
    },
    cedenteStore: { findById: () => Promise.resolve(ok(account)) },
    periods: { isClosed: () => Promise.resolve(ok(false)) },
    clock: { now: () => new Date('2026-08-27T10:00:00.000Z') },
    documents: {
      findById: () => Promise.resolve(ok({ document: openDocument, payables, version: 1 })),
    },
    payableDocs: {
      findByPayableIds: () =>
        Promise.resolve(ok(opts.rows ?? [docRow(String(parentId), 'Parent')])),
    },
    taxonomyPaths: taxonomyPathsOf(opts.paths ?? [VALID_PATH]),
  } as never;
};

describe('financial/application — confirmReconciliation + reclassificação (M2)', () => {
  it('sem `taxonomy` no input, nenhuma reclassificação viaja ao repo', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(buildDeps(cap))({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      reconciledBy: USER,
    });

    assert.equal(r.ok, true, JSON.stringify(r));
    assert.deepEqual(cap.reclassifications, []);
  });

  it('RN-M2-06/12: com `taxonomy`, a reclassificação chega no MESMO confirm, com os 5 refs', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(buildDeps(cap))({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    assert.equal(r.ok, true, JSON.stringify(r));
    assert.equal(cap.reclassifications?.length, 1);
    const rec = cap.reclassifications?.[0];
    assert.equal(rec?.documentId, String(documentId));
    assert.equal(rec?.programRef, PROGRAM);
    assert.equal(rec?.budgetPlanRef, PLAN);
    assert.equal(rec?.costCenterRef, COST_CENTER);
    assert.equal(rec?.categoryRef, CATEGORY);
    assert.equal(rec?.subcategoryRef, SUBCATEGORY);
  });

  it('RN-M2-07: a trilha registra o de→para no DOCUMENTO e em CADA título', async () => {
    const cap: Captured = { reclassifications: undefined };
    await confirmReconciliation(buildDeps(cap))({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    const timeline = cap.reclassifications?.[0]?.timeline ?? [];
    // 1 do documento + 1 do pai + 1 do filho: a cascata tem de ser auditável no título de imposto,
    // que é onde a pergunta "por que este imposto está sob este projeto?" é feita.
    assert.equal(timeline.length, 3);

    const targets = timeline.map((e) => `${e.target.kind}:${String(e.target.id)}`).sort();
    assert.deepEqual(
      targets,
      [
        `Document:${String(documentId)}`,
        `Payable:${String(parentId)}`,
        `Payable:${String(childId)}`,
      ].sort(),
    );

    const changes = timeline[0]?.changes ?? [];
    const program = changes.find((c) => c.field === 'programRef');
    assert.deepEqual(program, { field: 'programRef', before: null, after: PROGRAM });
    const category = changes.find((c) => c.field === 'categoryRef');
    assert.equal(category?.before, '88888888-8888-4888-8888-888888888888');
    assert.equal(category?.after, CATEGORY);
  });

  it('Invariante 6: reclassificar para o valor JÁ vigente não gera entrada de trilha', async () => {
    const cap: Captured = { reclassifications: undefined };
    // Documento já classificado exatamente com o caminho pedido.
    const deps = buildDeps(cap) as unknown as Record<string, unknown>;
    (deps as { documents: unknown }).documents = {
      findById: () =>
        Promise.resolve(
          ok({
            document: { ...openDocument, ...TAXONOMY_INPUT },
            payables,
            version: 1,
          }),
        ),
    };

    await confirmReconciliation(deps as never)({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    assert.equal(cap.reclassifications?.length, 1);
    assert.deepEqual(cap.reclassifications?.[0]?.timeline, []);
    // O `DocumentSaved` continua indo: ele é idempotente e é o que cura projeção atrasada.
    assert.ok((cap.reclassifications?.[0]?.events.length ?? 0) > 0);
  });

  it('RN-M2-09 / M2-9: caminho incoerente com a árvore é recusado', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(buildDeps(cap))({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      // Subcategoria válida, mas sob OUTRA categoria — combinação que a tela não deveria montar.
      taxonomy: { ...TAXONOMY_INPUT, categoryRef: '00000000-0000-4000-8000-00000000ffff' },
      reconciledBy: USER,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'taxonomy-path-invalid');
    // Nada foi conciliado: a reclassificação é parte do ato, não efeito posterior.
    assert.equal(cap.reclassifications, undefined);
  });

  it('RN-M2-10 / M2-10: nó DESATIVADO entre a leitura e o confirm é recusado', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(
      buildDeps(cap, { paths: [{ ...VALID_PATH, active: false }] }),
    )({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'taxonomy-path-invalid');
  });

  it('folha inexistente é recusada (não se grava caminho que o plano não tem)', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(buildDeps(cap, { paths: [] }))({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'taxonomy-path-invalid');
  });

  it('RN-M2-11 / M2-7: seleção só de IMPOSTOS não habilita reclassificação', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(
      buildDeps(cap, { rows: [docRow(String(childId), 'Child')] }),
    )({
      transactionId: TX_ID,
      payableIds: [String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'reclassification-requires-parent-payable');
  });

  it('M2-8: seleção MISTA reclassifica pelo pai — o imposto entra por cascata, não como fonte', async () => {
    const cap: Captured = { reclassifications: undefined };
    const r = await confirmReconciliation(
      buildDeps(cap, {
        rows: [docRow(String(childId), 'Child'), docRow(String(parentId), 'Parent')],
      }),
    )({
      transactionId: TX_ID,
      payableIds: [String(parentId), String(childId)],
      taxonomy: TAXONOMY_INPUT,
      reconciledBy: USER,
    });

    assert.equal(r.ok, true, JSON.stringify(r));
    // UMA reclassificação, a do documento do pai — o filho não gera uma segunda.
    assert.equal(cap.reclassifications?.length, 1);
    assert.equal(cap.reclassifications?.[0]?.documentId, String(documentId));
  });
});
