import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';

const SUP = '11111111-1111-4111-8111-111111111111';

const nfseCommand = () => ({
  documentNumber: 'NFS-1',
  type: 'NFS-e' as const,
  supplierRef: SUP,
  paymentMethod: 'TED' as const,
  grossValueCents: 100000,
  sourceDiscountsCents: 5000,
  retentions: [
    { type: 'ISS', baseCents: 50000, rateBps: 1000, valueCents: 5000 },
    { type: 'IRRF', baseCents: 15000, rateBps: 1000, valueCents: 1500 },
    { type: 'INSS', baseCents: 110000, rateBps: 1000, valueCents: 11000 },
  ],
  dueDate: new Date('2026-07-01'),
});

describe('financial/application — saveDocument', () => {
  it('salva o documento, gera títulos e publica DocumentSaved no outbox', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const result = await saveDocument({ repo, outbox: outbox.port })(nfseCommand());

    assert.equal(isOk(result), true);
    if (result.ok) {
      // persistido
      const found = await repo.findById(result.value.documentId);
      assert.equal(isOk(found), true);
      if (found.ok) {
        assert.equal(found.value.document.status, 'Open');
        assert.equal(found.value.payables?.parent.value.cents, 77500);
        assert.equal(found.value.payables?.children.length, 3);
      }
      // evento publicado
      assert.ok(outbox.all().some((e) => e.type === 'DocumentSaved'));
    }
  });

  it('rejeita fornecedor com formato inválido (não persiste nem publica)', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const result = await saveDocument({ repo, outbox: outbox.port })({
      ...nfseCommand(),
      supplierRef: 'not-a-uuid',
    });
    assert.equal(isErr(result), true);
    assert.equal(outbox.all().length, 0);
  });

  it('rejeita retenção incompatível com o tipo (Boleto + ISS)', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const result = await saveDocument({ repo, outbox: outbox.port })({
      documentNumber: 'BOL-1',
      type: 'Boleto',
      supplierRef: SUP,
      paymentMethod: 'PIX',
      grossValueCents: 100000,
      retentions: [{ type: 'ISS', baseCents: 50000, rateBps: 1000, valueCents: 5000 }],
      dueDate: new Date('2026-07-01'),
    });
    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'retention-not-allowed-for-type');
  });
});
