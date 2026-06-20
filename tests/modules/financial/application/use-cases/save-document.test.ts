import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import {
  createInMemoryContractCategorizationReadStore,
  type ContractCategorizationView,
} from '#src/modules/contracts/public-api/index.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
// #48: reader vazio para os fluxos sem contrato (herança é no-op).
const emptyReader = createInMemoryContractCategorizationReadStore();

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
    const result = await saveDocument({
      repo,
      outbox: outbox.port,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
    })(nfseCommand());

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
    const result = await saveDocument({
      repo,
      outbox: outbox.port,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
    })({
      ...nfseCommand(),
      supplierRef: 'not-a-uuid',
    });
    assert.equal(isErr(result), true);
    assert.equal(outbox.all().length, 0);
  });

  it('rejeita retenção incompatível com o tipo (Boleto + ISS)', async () => {
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const result = await saveDocument({
      repo,
      outbox: outbox.port,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
    })({
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

  it('#48: herda programRef/budgetPlanRef do contrato vinculado quando não informados', async () => {
    const CONTRACT = '99999999-9999-4999-8999-999999999999';
    const PROGRAM = '77777777-7777-4777-8777-777777777777';
    const BUDGET = '66666666-6666-4666-8666-666666666666';
    const view: ContractCategorizationView = {
      contractId: CONTRACT,
      programId: PROGRAM,
      budgetPlanId: BUDGET,
      categorizacao: 'Custeio',
      centroDeCusto: 'CC-1',
    };
    const reader = createInMemoryContractCategorizationReadStore(new Map([[CONTRACT, view]]));
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    // contractRef setado, mas sem programRef/budgetPlanRef → herda do contrato.
    const result = await saveDocument({
      repo,
      outbox: outbox.port,
      clock: CLOCK,
      contractCategorizationReader: reader,
    })({ ...nfseCommand(), contractRef: CONTRACT });
    assert.equal(isOk(result), true);
    if (result.ok) {
      const found = await repo.findById(result.value.documentId);
      assert.equal(isOk(found), true);
      if (found.ok) {
        assert.equal(String(found.value.document.programRef), PROGRAM);
        assert.equal(String(found.value.document.budgetPlanRef), BUDGET);
      }
    }
  });

  it('#48: ref informada pelo front prevalece sobre a do contrato (pré-fill editável)', async () => {
    const CONTRACT = '99999999-9999-4999-8999-999999999999';
    const FRONT_PROGRAM = '88888888-8888-4888-8888-888888888888';
    const view: ContractCategorizationView = {
      contractId: CONTRACT,
      programId: '77777777-7777-4777-8777-777777777777',
      budgetPlanId: null,
      categorizacao: null,
      centroDeCusto: null,
    };
    const reader = createInMemoryContractCategorizationReadStore(new Map([[CONTRACT, view]]));
    const repo = createInMemoryDocumentRepository();
    const outbox = createInMemoryOutbox();
    const result = await saveDocument({
      repo,
      outbox: outbox.port,
      clock: CLOCK,
      contractCategorizationReader: reader,
    })({ ...nfseCommand(), contractRef: CONTRACT, programRef: FRONT_PROGRAM });
    assert.equal(isOk(result), true);
    if (result.ok) {
      const found = await repo.findById(result.value.documentId);
      if (found.ok) assert.equal(String(found.value.document.programRef), FRONT_PROGRAM);
    }
  });
});
