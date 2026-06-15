import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';

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

describe('financial/domain/document — rascunho (US7)', () => {
  it('CT-024: salvar rascunho parcial persiste em Draft sem gerar títulos', () => {
    const r = Document.saveDraft({
      id: DocumentId.generate(),
      documentNumber: 'NFS-1',
      type: 'NFS-e',
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Draft');
      assert.equal(r.value.document.documentNumber, 'NFS-1');
      assert.equal(r.value.document.supplier, null); // não preenchido ainda
      assert.ok(r.value.events.some((e) => e.type === 'DocumentDraftSaved'));
    }
  });

  it('CT-025: submeter rascunho completo promove para Open e gera títulos', () => {
    const draft = Document.saveDraft({
      id: DocumentId.generate(),
      documentNumber: 'BOL-1',
      type: 'Boleto',
      supplier: supplier(),
      paymentMethod: 'PIX',
      grossValue: money(100000),
      dueDate: new Date('2026-07-01'),
    });
    if (!draft.ok) throw new Error('saveDraft falhou');
    const r = Document.submit(draft.value.document);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.document.status, 'Open');
      assert.equal(r.value.payables.parent.value.cents, 100000);
    }
  });

  it('CT-026: submeter rascunho incompleto é rejeitado', () => {
    const draft = Document.saveDraft({ id: DocumentId.generate(), documentNumber: 'BOL-1' });
    if (!draft.ok) throw new Error('saveDraft falhou');
    const r = Document.submit(draft.value.document);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'document-incomplete');
  });
});
