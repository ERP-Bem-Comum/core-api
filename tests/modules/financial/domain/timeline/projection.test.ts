import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
// API RED — ainda não existe (W0): domain/timeline/projection.ts (ADR-0001 — diff por função pura).
import { diffDocument, projectEntry } from '#src/modules/financial/domain/timeline/projection.ts';

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
const openDoc = (): Document.CreateDocumentOutput => {
  const r = Document.create({
    id: DocumentId.generate(),
    documentNumber: 'NFS-1',
    type: 'NFS-e',
    supplier: supplier(),
    paymentMethod: 'TED',
    grossValue: money(100000),
    sourceDiscounts: Money.ZERO,
    discounts: Money.ZERO,
    penalty: Money.ZERO,
    interest: Money.ZERO,
    retentions: [],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('test setup: open doc');
  return r.value;
};

describe('financial/domain/timeline/projection — diff por função pura (ADR-0001)', () => {
  it('CT-010: diffDocument detecta mudança de valor bruto e recálculo do líquido', () => {
    const before = openDoc();
    const adjusted = Document.adjust({
      document: before.document,
      payables: before.payables,
      changes: { grossValue: money(200000) },
    });
    if (!adjusted.ok) throw new Error('test setup: adjust');

    const changes = diffDocument(before.document, adjusted.value.document);
    const fields = changes.map((c) => c.field);
    assert.ok(fields.includes('grossValue'), 'deve registrar mudança de grossValue');
    assert.ok(fields.includes('netValue'), 'deve registrar recálculo do netValue');

    const gross = changes.find((c) => c.field === 'grossValue');
    assert.equal(gross?.before, '100000');
    assert.equal(gross?.after, '200000');
  });

  it('diffDocument na criação (before = null) registra os campos iniciais', () => {
    const created = openDoc();
    const changes = diffDocument(null, created.document);
    assert.ok(changes.length > 0, 'criação registra campos iniciais');
    assert.ok(
      changes.every((c) => c.before === null),
      'na criação, before de cada campo é null',
    );
  });

  it('CT-011: projectEntry emite entrada com alvo Document e changes para um marco', () => {
    const before = openDoc();
    const adjusted = Document.adjust({
      document: before.document,
      payables: before.payables,
      changes: { grossValue: money(150000) },
    });
    if (!adjusted.ok) throw new Error('test setup: adjust');

    const at = new Date('2026-06-15T12:00:00.000Z');
    const entries = projectEntry({
      eventId: '99999999-9999-4999-8999-999999999999',
      event: adjusted.value.events[0]!,
      before: before.document,
      after: adjusted.value.document,
      payablesBefore: before.payables,
      payablesAfter: adjusted.value.payables,
      actor: null,
      occurredAt: at,
    });

    const docEntry = entries.find((e) => e.target.kind === 'Document');
    assert.ok(docEntry, 'deve haver entrada com alvo Document');
    assert.equal(docEntry.occurredAt.getTime(), at.getTime());
    assert.ok(docEntry.changes.some((c) => c.field === 'grossValue'));
    // #56a: o discriminador de evento da entry é `eventType` (não `kind`). RED enquanto o campo for `kind`.
    assert.equal(docEntry.eventType, 'DocumentSaved');
  });
});
