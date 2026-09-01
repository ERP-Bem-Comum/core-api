// M2 — reclassificação da taxonomia (5 níveis) no agregado Document.
//
// Cobre as regras que são DECISÃO do domínio; as que dependem de infraestrutura (atomicidade,
// reprojeção, validação contra a árvore do plano) têm suíte própria na application e na persistência.
//
//   RN-M2-03  — last-write-wins: os 5 refs do documento passam a ser os informados.
//   RN-M2-04  — cascata pai→filhos: TODOS os títulos do documento passam a responder pela mesma
//               classificação, e o `DocumentSaved` emitido cobre pai e filhos (é ele que reprojeta).
//   RN-M2-11  — só o título LÍQUIDO é fonte; reclassificar por um filho de retenção é recusado.
//   RN-M2-12  — os 5 atravessam, `budgetPlanRef`/`subcategoryRef` inclusive (o descarte do #505).
//   Inv. 1    — nenhum título é criado, e nenhum id muda.
//   Inv. 6    — reclassificar para o mesmo valor não altera nada.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { DocumentTaxonomy } from '#src/modules/financial/domain/document/document.ts';
import type { OpenDocument } from '#src/modules/financial/domain/document/types.ts';
import type { Payables } from '#src/modules/financial/domain/payable/types.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import { fromCents } from '#src/shared/kernel/money.ts';

const PROGRAM = '11111111-1111-4111-8111-111111111111';
const PLAN = '22222222-2222-4222-8222-222222222222';
const COST_CENTER = '33333333-3333-4333-8333-333333333333';
const CATEGORY = '44444444-4444-4444-8444-444444444444';
const SUBCATEGORY = '55555555-5555-4555-8555-555555555555';

const money = (cents: number) => {
  const m = fromCents(cents);
  if (!m.ok) throw new Error('setup: money');
  return m.value;
};

const TAXONOMY = {
  programRef: PROGRAM,
  budgetPlanRef: PLAN,
  costCenterRef: COST_CENTER,
  categoryRef: CATEGORY,
  subcategoryRef: SUBCATEGORY,
} as unknown as DocumentTaxonomy;

// Documento com UM filho de retenção (ISS) — o arranjo mínimo em que a cascata é observável.
const setup = () => {
  const documentId = DocumentId.generate();
  const parentId = PayableId.generate();
  const childId = PayableId.generate();
  const dueDate = new Date('2026-09-10T00:00:00.000Z');

  const document = {
    id: documentId,
    documentNumber: 'NF-M2-001',
    series: null,
    type: 'NFS-e',
    supplier: '66666666-6666-4666-8666-666666666666',
    payeeKind: 'supplier',
    contractRef: null,
    // Classificação ANTERIOR — é o "de" do de→para.
    budgetPlanRef: '99999999-9999-4999-8999-999999999999',
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
      status: 'Open',
      value: money(95_000),
      dueDate,
      paymentMethod: 'PIX',
      paymentDetail: null,
      paidAt: null,
    },
    children: [
      {
        id: childId,
        origin: documentId,
        kind: 'Child',
        retentionType: 'ISS',
        status: 'Open',
        value: money(5_000),
        // Vencimento PRÓPRIO, distinto do pai — é o que a cascata NÃO pode tocar.
        dueDate: new Date('2026-10-15T00:00:00.000Z'),
        paymentMethod: 'GuiaRecolhimento',
        paymentDetail: null,
        paidAt: null,
      },
    ],
  } as unknown as Payables;

  return { document, payables, parentId, childId, documentId };
};

describe('financial/domain — reclassifyTaxonomy (M2)', () => {
  it('RN-M2-03/12: os CINCO refs passam a valer no documento (last-write-wins)', () => {
    const { document, payables, parentId } = setup();

    const r = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: parentId,
      taxonomy: TAXONOMY,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.document.programRef, PROGRAM);
    assert.equal(r.value.document.budgetPlanRef, PLAN);
    assert.equal(r.value.document.costCenterRef, COST_CENTER);
    assert.equal(r.value.document.categoryRef, CATEGORY);
    // O par que o #505 descartava no caminho vizinho — aqui os dois têm de chegar.
    assert.equal(r.value.document.subcategoryRef, SUBCATEGORY);
  });

  it('RN-M2-04: o DocumentSaved emitido carrega os 5 refs e cobre pai E filho — é a cascata', () => {
    const { document, payables, parentId, childId } = setup();

    const r = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: parentId,
      taxonomy: TAXONOMY,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const saved = r.value.events.find((e) => e.type === 'DocumentSaved');
    assert.ok(saved !== undefined, 'DocumentSaved é o que reprojeta o fin_payable_view');
    if (saved?.type !== 'DocumentSaved') return;

    // Os refs viajam UMA vez (top-level do evento) e valem para todo título do snapshot: é assim
    // que a projeção escreve a MESMA classificação na linha do pai e na do filho.
    assert.equal(saved.programRef, PROGRAM);
    assert.equal(saved.budgetPlanRef, PLAN);
    assert.equal(saved.costCenterRef, COST_CENTER);
    assert.equal(saved.categoryRef, CATEGORY);
    assert.equal(saved.subcategoryRef, SUBCATEGORY);

    // Invariante 2 da spec, observável aqui: o snapshot cobre os DOIS títulos.
    const ids = saved.payables.map((p) => p.payableId).sort();
    assert.deepEqual(ids, [String(parentId), String(childId)].sort());
  });

  it('RN-M2-04: o vencimento do imposto NÃO é tocado — só categorização cascateia', () => {
    const { document, payables, parentId } = setup();
    const childDueBefore = payables.children[0]?.dueDate.toISOString();

    const r = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: parentId,
      taxonomy: TAXONOMY,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(r.value.payables.children[0]?.dueDate.toISOString(), childDueBefore);
    assert.equal(
      r.value.payables.parent.dueDate.toISOString(),
      payables.parent.dueDate.toISOString(),
    );
  });

  it('Invariante 1: nenhum título é criado e nenhuma identidade muda', () => {
    const { document, payables, parentId, childId } = setup();

    const r = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: parentId,
      taxonomy: TAXONOMY,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(r.value.payables.children.length, 1);
    assert.equal(r.value.payables.parent.id, parentId);
    assert.equal(r.value.payables.children[0]?.id, childId);
  });

  it('RN-M2-11: reclassificar POR UM FILHO de retenção é recusado', () => {
    const { document, payables, childId } = setup();

    const r = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: childId,
      taxonomy: TAXONOMY,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'reclassification-source-not-parent');
  });

  it('título que não é do documento → payable-not-found (não se confunde com o guard acima)', () => {
    const { document, payables } = setup();

    const r = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: PayableId.generate(),
      taxonomy: TAXONOMY,
    });

    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'payable-not-found');
  });

  it('Invariante 6: reclassificar para o MESMO valor não muda a taxonomia do documento', () => {
    const { document, payables, parentId } = setup();

    const first = Document.reclassifyTaxonomy({
      document,
      payables,
      sourcePayableId: parentId,
      taxonomy: TAXONOMY,
    });
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = Document.reclassifyTaxonomy({
      document: first.value.document,
      payables: first.value.payables,
      sourcePayableId: parentId,
      taxonomy: TAXONOMY,
    });
    assert.equal(second.ok, true);
    if (!second.ok) return;

    assert.equal(
      Document.sameTaxonomy(
        Document.taxonomyOf(first.value.document),
        Document.taxonomyOf(second.value.document),
      ),
      true,
    );
  });
});
