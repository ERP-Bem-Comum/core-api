/**
 * #235 (FIN-PAYABLE-READMODEL) — W0 RED · CA1.
 * O evento DocumentSaved deve carregar o snapshot projetável (por título + refs do documento),
 * para alimentar a projeção do read-model fin_payable_view (ADR-0022 — projeção evento-carregada).
 * Hoje o evento é magro ({ type, documentId, payableIds }) → asserts abaixo falham.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';

const SUP = '11111111-1111-4111-8111-111111111111';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));
const emptyReader = createInMemoryContractCategorizationReadStore();
const emptyCedente = createInMemoryCedenteAccountStore();

// net = 100000 − 5000 (fonte) − 17500 (retenções) = 77500; 1 pai + 3 filhos.
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

type EnrichedPayable = Readonly<{
  payableId: string;
  kind: 'Parent' | 'Child';
  retentionType: string | null;
  valueCents: string;
  dueDate: string;
  status: string;
}>;
type EnrichedDocumentSaved = Readonly<{
  type: 'DocumentSaved';
  documentId: unknown;
  supplierRef: string | null;
  contractRef: string | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
  payables: readonly EnrichedPayable[];
}>;

describe('financial/application — DocumentSaved enriquecido para projeção (#235 · CA1)', () => {
  it('CA1: DocumentSaved carrega refs do documento + snapshot por título', async () => {
    const outbox = createInMemoryOutbox();
    const repo = createInMemoryDocumentRepository(undefined, undefined, outbox.port);
    const result = await saveDocument({
      repo,
      clock: CLOCK,
      contractCategorizationReader: emptyReader,
      cedenteAccountStore: emptyCedente,
    })(nfseCommand());

    assert.equal(result.ok, true);
    const saved = outbox.all().find((e) => e.type === 'DocumentSaved') as
      | EnrichedDocumentSaved
      | undefined;
    assert.ok(saved, 'esperava DocumentSaved no outbox');

    // refs do documento (uma vez)
    assert.equal(saved.supplierRef, SUP);
    assert.equal(saved.contractRef, null);

    // snapshot por título: 1 pai (77500, Open) + 3 filhos
    assert.ok(Array.isArray(saved.payables), 'DocumentSaved.payables deve ser array (snapshot)');
    assert.equal(saved.payables.length, 4);
    const parent = saved.payables.find((p) => p.kind === 'Parent');
    assert.ok(parent, 'esperava título pai no snapshot');
    assert.equal(parent.valueCents, '77500');
    assert.equal(parent.status, 'Open');
    assert.equal(parent.dueDate, '2026-07-01');
    assert.equal(saved.payables.filter((p) => p.kind === 'Child').length, 3);
  });
});
