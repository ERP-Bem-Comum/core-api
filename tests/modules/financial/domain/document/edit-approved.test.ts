import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { PaymentMethod } from '#src/modules/financial/domain/document/types.ts';
import type { Payable, Payables } from '#src/modules/financial/domain/payable/types.ts';
import {
  BudgetPlanRef,
  CategoryRef,
  CostCenterRef,
  ProgramRef,
  SubcategoryRef,
} from '#src/modules/financial/domain/shared/refs.ts';

// #1057 — edição do documento Aprovado (decisões da P.O., 14/10).

const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const AT = new Date('2026-10-23T12:00:00Z');
// Mesmos códigos que `update-payable-payment.test.ts` usa como válidos para cada forma.
const BOLETO_BARCODE = '3'.repeat(44);
const GUIA_BARCODE = '8'.repeat(44);

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup money');
  return r.value;
};

const approved = (
  paymentMethod: PaymentMethod,
  paymentDetail: string | null,
): Document.ApproveDocumentOutput => {
  const supplier = SupplierRef.rehydrate(SUP);
  const iss = Retention.create({ type: 'ISS', baseCents: 50000, rateBps: 1000, valueCents: 5000 });
  const by = UserRef.rehydrate(USER);
  if (!supplier.ok || !iss.ok || !by.ok) throw new Error('setup refs');
  const c = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1057',
    type: 'NFS-e',
    supplier: supplier.value,
    paymentMethod,
    paymentDetail,
    grossValue: money(100000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [iss.value],
    registeredTaxes: [],
    dueDate: new Date('2026-11-01'),
  });
  if (!c.ok) throw new Error('setup create');
  const a = Document.approve({ ...c.value, by: by.value, at: new Date('2026-10-20') });
  if (!a.ok) throw new Error('setup approve');
  return a.value;
};

const withParent = (payables: Payables, change: Partial<Payable>): Payables => ({
  parent: { ...payables.parent, ...change },
  children: payables.children,
});

const taxonomy = (): Document.DocumentTaxonomy => {
  const program = ProgramRef.rehydrate('a1000000-0000-4000-8000-000000000001');
  const plan = BudgetPlanRef.rehydrate('a1000000-0000-4000-8000-000000000002');
  const center = CostCenterRef.rehydrate('a1000000-0000-4000-8000-000000000003');
  const category = CategoryRef.rehydrate('a1000000-0000-4000-8000-000000000004');
  const sub = SubcategoryRef.rehydrate('a1000000-0000-4000-8000-000000000005');
  if (!program.ok || !plan.ok || !center.ok || !category.ok || !sub.ok) throw new Error('refs');
  return {
    programRef: program.value,
    budgetPlanRef: plan.value,
    costCenterRef: center.value,
    categoryRef: category.value,
    subcategoryRef: sub.value,
  };
};

describe('Document.editApproved (#1057)', () => {
  it('Boleto → PIX: troca a forma do PAI, limpa o código, marca a troca e mantém Aprovado', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const r = Document.editApproved({ ...a, paymentMethod: 'PIX', heldPayableIds: [], at: AT });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const { document, payables } = r.value;
    assert.equal(document.status, 'Approved');
    assert.equal(document.paymentMethod, 'PIX', 'o documento espelha a forma do pai');
    assert.equal(document.paymentDetail, null);
    assert.equal(payables.parent.paymentMethod, 'PIX');
    assert.equal(payables.parent.paymentDetail, null, 'o código de barras não serve ao Pix');
    assert.deepEqual(payables.parent.paymentMethodChangedAt, AT);
    for (const child of payables.children) {
      assert.equal(child.paymentMethod, 'Boleto', 'o imposto mantém a forma dele');
      assert.equal(child.paymentMethodChangedAt, null);
    }
    assert.equal(r.value.events[0]?.type, 'DocumentSaved');
  });

  it('forma nova aceita complemento próprio (ex.: Outro com texto livre)', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const r = Document.editApproved({
      ...a,
      paymentMethod: 'Outro',
      paymentDetail: 'pago no caixa',
      heldPayableIds: [],
      at: AT,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.payables.parent.paymentDetail, 'pago no caixa');
  });

  it('segunda troca depois da aprovação → payment-method-already-changed', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const first = Document.editApproved({ ...a, paymentMethod: 'PIX', heldPayableIds: [], at: AT });
    if (!first.ok) throw new Error('setup first change');
    const r = Document.editApproved({
      ...first.value,
      paymentMethod: 'TED',
      heldPayableIds: [],
      at: AT,
    });
    assert.deepEqual(r, { ok: false, error: 'payment-method-already-changed' });
  });

  it('trocar PARA Boleto/Guia → payment-method-not-allowed-after-approval', () => {
    const a = approved('PIX', null);
    for (const target of ['Boleto', 'GuiaRecolhimento'] as const) {
      const r = Document.editApproved({
        ...a,
        paymentMethod: target,
        paymentDetail: target === 'Boleto' ? BOLETO_BARCODE : GUIA_BARCODE,
        heldPayableIds: [],
        at: AT,
      });
      assert.deepEqual(r, { ok: false, error: 'payment-method-not-allowed-after-approval' });
    }
  });

  it('Boleto que continua Boleto: o código de barras não se edita', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const r = Document.editApproved({
      ...a,
      paymentDetail: '4'.repeat(44),
      heldPayableIds: [],
      at: AT,
    });
    assert.deepEqual(r, { ok: false, error: 'payment-barcode-not-editable' });
  });

  it('Guia pai lançada SEM código recebe o código depois de aprovada (sem marcar troca)', () => {
    const a = approved('GuiaRecolhimento', null);
    const r = Document.editApproved({
      ...a,
      paymentDetail: GUIA_BARCODE,
      heldPayableIds: [],
      at: AT,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.payables.parent.paymentDetail, GUIA_BARCODE);
    assert.equal(r.value.payables.parent.paymentMethodChangedAt, null, 'não é troca de forma');
    for (const child of r.value.payables.children) {
      assert.equal(child.paymentDetail, null, 'imposto filho não recebe o código do pai');
    }
  });

  it('Guia que já tem código não troca de código', () => {
    const a = approved('GuiaRecolhimento', GUIA_BARCODE);
    const r = Document.editApproved({
      ...a,
      paymentDetail: '8'.repeat(43) + '7',
      heldPayableIds: [],
      at: AT,
    });
    assert.deepEqual(r, { ok: false, error: 'payment-barcode-not-editable' });
  });

  it('título pai Transmitido: forma recusada (payable-payment-locked), descrição segue editável', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const transmitted = withParent(a.payables, { status: 'Transmitted' });
    const refused = Document.editApproved({
      document: a.document,
      payables: transmitted,
      paymentMethod: 'PIX',
      heldPayableIds: [],
      at: AT,
    });
    assert.deepEqual(refused, { ok: false, error: 'payable-payment-locked' });

    const described = Document.editApproved({
      document: a.document,
      payables: transmitted,
      description: 'nova descrição',
      taxonomy: taxonomy(),
      heldPayableIds: [],
      at: AT,
    });
    assert.equal(described.ok, true);
    if (described.ok) assert.equal(described.value.document.description, 'nova descrição');
  });

  it('título pai preso em remessa viva: forma recusada com document-has-held-payable', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const r = Document.editApproved({
      ...a,
      paymentMethod: 'PIX',
      heldPayableIds: [a.payables.parent.id],
      at: AT,
    });
    assert.deepEqual(r, { ok: false, error: 'document-has-held-payable' });
  });

  it('pedir a mesma forma e o mesmo complemento não é troca — nenhuma trava é consultada', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const transmitted = withParent(a.payables, { status: 'Transmitted' });
    const r = Document.editApproved({
      document: a.document,
      payables: transmitted,
      paymentMethod: 'Boleto',
      paymentDetail: BOLETO_BARCODE,
      heldPayableIds: [transmitted.parent.id],
      at: AT,
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.payables.parent.paymentMethodChangedAt, null);
  });

  it('categorização: grava os 5 níveis no documento e o DocumentSaved leva a todos os títulos', () => {
    const a = approved('PIX', null);
    const t = taxonomy();
    const r = Document.editApproved({ ...a, taxonomy: t, heldPayableIds: [], at: AT });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.deepEqual(Document.taxonomyOf(r.value.document), t);
    const event = r.value.events[0];
    assert.equal(event?.type, 'DocumentSaved');
    if (event?.type === 'DocumentSaved') {
      assert.equal(event.subcategoryRef, t.subcategoryRef);
      assert.equal(event.payables.length, 1 + a.payables.children.length);
    }
  });

  it('voltar para edição limpa a marca — uma nova aprovação é um novo ciclo', () => {
    const a = approved('Boleto', BOLETO_BARCODE);
    const changed = Document.editApproved({
      ...a,
      paymentMethod: 'PIX',
      heldPayableIds: [],
      at: AT,
    });
    if (!changed.ok) throw new Error('setup change');
    const undone = Document.undoApproval(changed.value);
    assert.equal(undone.ok, true);
    if (undone.ok) assert.equal(undone.value.payables.parent.paymentMethodChangedAt, null);
  });
});
