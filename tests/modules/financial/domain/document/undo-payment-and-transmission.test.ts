// #61 — desfazer a baixa, desfazer a transmissão e a trava do "Voltar para edição" (decisões da
// P.O., 02/10, 03/10 e 19/10). Domínio puro: o status anterior chega pronto (o use case o lê da
// trilha), e a regra da fila da remessa é do use case — aqui só as transições e as recusas.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import type { Payable, Payables } from '#src/modules/financial/domain/payable/types.ts';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate('11111111-1111-4111-8111-111111111111');
  if (!r.ok) throw new Error('test setup: supplier');
  return r.value;
};
const by = (): UserRef.UserRef => {
  const r = UserRef.rehydrate('22222222-2222-4222-8222-222222222222');
  if (!r.ok) throw new Error('test setup: user-ref');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};

const approved = (): Document.ApproveDocumentOutput => {
  const created = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: money(5000),
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!created.ok) throw new Error('test setup: create');
  const a = Document.approve({
    document: created.value.document,
    payables: created.value.payables,
    by: by(),
    at: new Date('2026-07-10'),
  });
  if (!a.ok) throw new Error('test setup: approve');
  return a.value;
};

/** O pai em `status` (com `paidAt` quando Pago); os filhos seguem Aprovados. */
const withParent = (ap: Document.ApproveDocumentOutput, status: DocumentStatus): Payables =>
  immutable<Payables>({
    parent: immutable<Payable>({
      ...ap.payables.parent,
      status,
      paidAt: status === 'Paid' ? new Date('2026-07-15') : null,
    }),
    children: ap.payables.children,
  });

describe('#61 — undoManualPayment (Pago → status anterior)', () => {
  for (const origin of ['Approved', 'Transmitted'] as const) {
    it(`volta a ${origin}, limpa a data e emite o evento com motivo e destino`, () => {
      const ap = approved();
      const r = Document.undoManualPayment({
        document: ap.document,
        payables: withParent(ap, 'Paid'),
        payableId: ap.payables.parent.id,
        restoreTo: origin,
        by: by(),
        reason: '  Data da baixa digitada errada  ',
      });
      assert.ok(r.ok, r.ok ? '' : r.error);
      assert.equal(r.value.payables.parent.status, origin);
      assert.equal(r.value.payables.parent.paidAt, null);
      assert.equal(r.value.document.status, 'Approved');
      assert.ok(r.value.payables.children.every((c) => c.status === 'Approved'));
      assert.deepEqual(r.value.events[0], {
        type: 'ManualPaymentUndone',
        documentId: ap.document.id,
        payableId: ap.payables.parent.id,
        restoredStatus: origin,
        undoneBy: by(),
        reason: 'Data da baixa digitada errada',
      });
    });
  }

  for (const status of ['Approved', 'Transmitted', 'Reconciled', 'PartiallyReconciled'] as const) {
    it(`título ${status} → payable-not-paid (conciliado desfaz a conciliação antes)`, () => {
      const ap = approved();
      const r = Document.undoManualPayment({
        document: ap.document,
        payables: withParent(ap, status),
        payableId: ap.payables.parent.id,
        restoreTo: 'Approved',
        by: by(),
        reason: 'x',
      });
      assert.equal(r.ok ? null : r.error, 'payable-not-paid');
    });
  }

  it('motivo em branco → undo-requires-reason', () => {
    const ap = approved();
    const r = Document.undoManualPayment({
      document: ap.document,
      payables: withParent(ap, 'Paid'),
      payableId: ap.payables.parent.id,
      restoreTo: 'Approved',
      by: by(),
      reason: '   ',
    });
    assert.equal(r.ok ? null : r.error, 'undo-requires-reason');
  });

  it('título de outro documento → payable-not-found', () => {
    const ap = approved();
    const other = approved();
    const r = Document.undoManualPayment({
      document: ap.document,
      payables: withParent(ap, 'Paid'),
      payableId: other.payables.parent.id,
      restoreTo: 'Approved',
      by: by(),
      reason: 'x',
    });
    assert.equal(r.ok ? null : r.error, 'payable-not-found');
  });
});

describe('#61 — undoTransmission (Transmitido → Aprovado)', () => {
  it('volta a Approved e o evento carrega a remessa de onde voltou', () => {
    const ap = approved();
    const r = Document.undoTransmission({
      document: ap.document,
      payables: withParent(ap, 'Transmitted'),
      payableId: ap.payables.parent.id,
      remittanceId: 'rem-1',
      by: by(),
      reason: 'Banco não processou a remessa',
    });
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.payables.parent.status, 'Approved');
    const event = r.value.events[0];
    assert.equal(event?.type, 'TransmissionUndone');
    assert.equal(event?.type === 'TransmissionUndone' ? event.remittanceId : null, 'rem-1');
  });

  for (const status of ['Approved', 'Paid'] as const) {
    it(`título ${status} → payable-not-transmitted`, () => {
      const ap = approved();
      const r = Document.undoTransmission({
        document: ap.document,
        payables: withParent(ap, status),
        payableId: ap.payables.parent.id,
        remittanceId: 'rem-1',
        by: by(),
        reason: 'x',
      });
      assert.equal(r.ok ? null : r.error, 'payable-not-transmitted');
    });
  }

  it('motivo em branco → undo-requires-reason', () => {
    const ap = approved();
    const r = Document.undoTransmission({
      document: ap.document,
      payables: withParent(ap, 'Transmitted'),
      payableId: ap.payables.parent.id,
      remittanceId: 'rem-1',
      by: by(),
      reason: '',
    });
    assert.equal(r.ok ? null : r.error, 'undo-requires-reason');
  });
});

describe('#61 — undoApproval só com todos os títulos em Aprovado (P.O., 19/10)', () => {
  for (const status of ['Transmitted', 'Paid', 'PartiallyReconciled', 'Reconciled'] as const) {
    it(`um título ${status} → document-has-progressed-payable (nada muda)`, () => {
      const ap = approved();
      const r = Document.undoApproval({ document: ap.document, payables: withParent(ap, status) });
      assert.equal(r.ok ? null : r.error, 'document-has-progressed-payable');
    });
  }

  it('um FILHO transmitido também trava — a nota volta inteira para edição', () => {
    const ap = approved();
    const [first, ...rest] = ap.payables.children;
    if (first === undefined) throw new Error('fixture sem filhos');
    const payables = immutable<Payables>({
      parent: ap.payables.parent,
      children: [immutable<Payable>({ ...first, status: 'Transmitted' }), ...rest],
    });
    const r = Document.undoApproval({ document: ap.document, payables });
    assert.equal(r.ok ? null : r.error, 'document-has-progressed-payable');
  });

  it('todos Aprovados → segue voltando para Open (comportamento de antes)', () => {
    const ap = approved();
    const r = Document.undoApproval({ document: ap.document, payables: ap.payables });
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.document.status, 'Open');
  });
});
