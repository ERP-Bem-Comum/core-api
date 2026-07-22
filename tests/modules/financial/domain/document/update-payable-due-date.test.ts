/**
 * W0 RED — FIN-PAYABLE-DUEDATE-ISOLATED (#270). Domínio: `Document.updatePayableDueDate` altera o
 * `dueDate` de UM título (parent OU child) SEM propagar aos irmãos nem ao documento-pai. Contrasta com
 * `editMetadata` (#165), que propaga o dueDate a todos os payables. RED por inexistência da API.
 *
 * CA1: altera só aquele título (documento-pai e demais títulos inalterados).
 * CA3 (domínio): payableId inexistente → 'payable-not-found'.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId, PayableId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const ORIGINAL_DUE = new Date('2026-07-01');
const NEW_DUE = new Date('2027-03-15');

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('setup money');
  return r.value;
};
const supplier = (): SupplierRef => {
  const r = SupplierRef.rehydrate(SUP);
  if (!r.ok) throw new Error('setup supplier');
  return r.value;
};
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('setup retention');
  return r.value;
};

// NFS-e com 3 retenções → parent + 3 children, todos com dueDate = ORIGINAL_DUE.
const seed = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-270',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: money(5000),
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    registeredTaxes: [],
    dueDate: ORIGINAL_DUE,
  });
  if (!r.ok) throw new Error('setup create');
  return r.value;
};

const iso = (d: Date): string => d.toISOString();

describe('financial/domain — updatePayableDueDate (#270)', () => {
  it('CA1: altera o dueDate de UM child — documento, título-pai e irmãos inalterados', () => {
    const { document, payables } = seed();
    const target = payables.children[0]!;

    const r = Document.updatePayableDueDate({
      document,
      payables,
      payableId: target.id,
      dueDate: NEW_DUE,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    const out = r.value;

    const changed = out.payables.children.find((c) => c.id === target.id)!;
    assert.equal(iso(changed.dueDate), iso(NEW_DUE), 'o título alvo recebe o novo vencimento');

    // Título-pai inalterado.
    assert.equal(iso(out.payables.parent.dueDate), iso(ORIGINAL_DUE), 'título-pai não propaga');
    // Irmãos (demais children) inalterados.
    for (const c of out.payables.children) {
      if (c.id === target.id) continue;
      assert.equal(iso(c.dueDate), iso(ORIGINAL_DUE), 'irmão não propaga');
    }
    // Documento-pai inalterado (não propaga para o agregado).
    assert.equal(iso(out.document.dueDate), iso(ORIGINAL_DUE), 'documento não propaga');
  });

  it('CA1: altera o dueDate do título-pai — children inalterados', () => {
    const { document, payables } = seed();

    const r = Document.updatePayableDueDate({
      document,
      payables,
      payableId: payables.parent.id,
      dueDate: NEW_DUE,
    });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(iso(r.value.payables.parent.dueDate), iso(NEW_DUE));
    for (const c of r.value.payables.children) {
      assert.equal(iso(c.dueDate), iso(ORIGINAL_DUE), 'child não propaga');
    }
    assert.equal(iso(r.value.document.dueDate), iso(ORIGINAL_DUE));
  });

  it('preserva a identidade do título alvo — só o dueDate muda (id/kind/status/valor)', () => {
    const { document, payables } = seed();
    const target = payables.children[0]!;

    const r = Document.updatePayableDueDate({
      document,
      payables,
      payableId: target.id,
      dueDate: NEW_DUE,
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const changed = r.value.payables.children.find((c) => c.id === target.id)!;
    assert.equal(changed.id, target.id);
    assert.equal(changed.kind, target.kind);
    assert.equal(changed.status, target.status);
    assert.equal(changed.value.cents, target.value.cents);
    assert.equal(changed.paymentMethod, target.paymentMethod);
  });

  it('CA3: payableId inexistente → payable-not-found', () => {
    const { document, payables } = seed();
    const r = Document.updatePayableDueDate({
      document,
      payables,
      payableId: PayableId.generate(),
      dueDate: NEW_DUE,
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'payable-not-found');
  });
});
