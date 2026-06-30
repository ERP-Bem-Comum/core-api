import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, err, isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import { DocumentId } from '#src/modules/financial/domain/shared/ids.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as Document from '#src/modules/financial/domain/document/document.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import type {
  FinancialOutbox,
  OutboxAppendError,
} from '#src/modules/financial/application/ports/outbox.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { cancelDocument } from '#src/modules/financial/application/use-cases/cancel-document.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';

// CA1/CA3 (#127) — paridade in-memory da atomicidade estado+evento provada no Drizzle (Docker).
// O use-case agora encaminha os eventos PARA DENTRO do `repo.save`/`repo.delete`; uma falha no
// append do outbox (dentro da tx) reverte TUDO: estado anterior preservado, COUNT == baseline.

const SUP = '11111111-1111-4111-8111-111111111111';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
const emptyReader = createInMemoryContractCategorizationReadStore();

// Outbox que sempre falha — injetada no repo para forçar o rollback dentro da tx do save/delete.
const failingOutbox: FinancialOutbox = {
  append: (): Promise<Result<void, OutboxAppendError>> =>
    Promise.resolve(err('outbox-append-failed')),
};

const nfseCommand = () => ({
  documentNumber: 'NFS-1',
  type: 'NFS-e' as const,
  supplierRef: SUP,
  paymentMethod: 'TED' as const,
  grossValueCents: 100000,
  sourceDiscountsCents: 5000,
  retentions: [
    { type: 'ISS' as const, baseCents: 50000, rateBps: 1000, valueCents: 5000 },
    { type: 'IRRF' as const, baseCents: 15000, rateBps: 1000, valueCents: 1500 },
    { type: 'INSS' as const, baseCents: 110000, rateBps: 1000, valueCents: 11000 },
  ],
  dueDate: new Date('2026-07-01'),
});

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
const createdNfse = (): Document.CreateDocumentOutput => {
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
  if (!r.ok) throw new Error('setup create');
  return r.value;
};

describe('financial/application — atomicidade documento+outbox (in-memory)', () => {
  it('CA3: falha no outbox durante saveDocument reverte o estado (COUNT == baseline 0)', async () => {
    const repo = createInMemoryDocumentRepository(undefined, undefined, failingOutbox);
    const result = await saveDocument({
      repo,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
      cedenteAccountStore: createInMemoryCedenteAccountStore(),
    })(nfseCommand());

    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'document-repository-failure');

    // Nada persistido — o INSERT do estado foi revertido junto com o append do outbox.
    const page = await repo.findPaged({}, 1, 50);
    assert.equal(page.ok, true);
    if (page.ok) assert.equal(page.value.total, 0);
  });

  it('CA3: falha no outbox durante cancelDocument (delete) preserva o documento', async () => {
    const repo = createInMemoryDocumentRepository(undefined, undefined, failingOutbox);
    // Seed sem eventos (outbox não é tocada) → documento Open persistido (baseline = 1).
    const c = createdNfse();
    const seeded = await repo.save({ document: c.document, payables: c.payables }, []);
    assert.equal(seeded.ok, true);

    const result = await cancelDocument({ repo })({
      documentId: c.document.id,
      expectedVersion: 0,
    });

    assert.equal(isErr(result), true);
    if (!result.ok) assert.equal(result.error, 'document-repository-failure');

    // Documento NÃO removido — o DELETE foi revertido com a falha do append.
    const found = await repo.findById(c.document.id);
    assert.equal(found.ok, true);
  });
});
