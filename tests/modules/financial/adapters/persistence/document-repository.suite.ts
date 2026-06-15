import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import type { DocumentRepository } from '#src/modules/financial/domain/document/repository.ts';

// Suíte de CONTRATO (test-pyramid-engineer): qualquer adapter de DocumentRepository (in-memory, drizzle)
// consome esta função e deve passar. NÃO é executada direto (sufixo .suite.ts).

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
const ret = (type: 'ISS' | 'IRRF' | 'INSS', valueCents: number): Retention.Retention => {
  const r = Retention.create({ type, baseCents: valueCents * 10, rateBps: 1000, valueCents });
  if (!r.ok) throw new Error('test setup: retention');
  return r.value;
};
const openNfse = (): Document.CreateDocumentOutput => {
  const r = Document.create({
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
    retentions: [ret('ISS', 5000), ret('IRRF', 1500), ret('INSS', 11000)],
    registeredTaxes: [],
    dueDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('test setup: open nfse');
  return r.value;
};

export const documentRepositoryContract = (makeRepo: () => DocumentRepository): void => {
  describe('DocumentRepository (contrato)', () => {
    it('save + findById faz round-trip de um documento Open com payables', async () => {
      const repo = makeRepo();
      const open = openNfse();
      const saved = await repo.save({ document: open.document, payables: open.payables });
      assert.equal(isOk(saved), true);

      const found = await repo.findById(open.document.id);
      assert.equal(isOk(found), true);
      if (found.ok) {
        assert.equal(found.value.document.id, open.document.id);
        assert.equal(found.value.document.status, 'Open');
        assert.equal(found.value.payables?.children.length, 3);
        assert.equal(found.value.payables?.parent.value.cents, open.payables.parent.value.cents);
      }
    });

    it('findById de id inexistente retorna document-not-found', async () => {
      const repo = makeRepo();
      const r = await repo.findById(DocumentId.generate());
      assert.equal(r.ok, false);
      if (!r.ok) assert.equal(r.error, 'document-not-found');
    });

    it('delete remove o agregado (findById passa a falhar)', async () => {
      const repo = makeRepo();
      const open = openNfse();
      await repo.save({ document: open.document, payables: open.payables });
      const del = await repo.delete(open.document.id);
      assert.equal(isOk(del), true);
      const found = await repo.findById(open.document.id);
      assert.equal(found.ok, false);
    });

    it('persiste rascunho (Draft) sem payables', async () => {
      const repo = makeRepo();
      const draft = Document.saveDraft({ id: DocumentId.generate(), documentNumber: 'D-1' });
      if (!draft.ok) throw new Error('saveDraft falhou');
      const saved = await repo.save({ document: draft.value.document, payables: null });
      assert.equal(isOk(saved), true);
      const found = await repo.findById(draft.value.document.id);
      if (found.ok) {
        assert.equal(found.value.document.status, 'Draft');
        assert.equal(found.value.payables, null);
      }
    });
  });
};
