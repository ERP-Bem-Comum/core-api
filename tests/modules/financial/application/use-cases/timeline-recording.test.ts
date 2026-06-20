import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';
import {
  createInMemoryTimelineRepository,
  type TimelineStore,
} from '#src/modules/financial/adapters/persistence/repos/timeline-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { FinancialTimelineEntry } from '#src/modules/financial/domain/timeline/types.ts';
import { saveDocument } from '#src/modules/financial/application/use-cases/save-document.ts';
import { createInMemoryContractCategorizationReadStore } from '#src/modules/contracts/public-api/index.ts';
import { approveDocument } from '#src/modules/financial/application/use-cases/approve-document.ts';
import { getDocumentTimeline } from '#src/modules/financial/application/use-cases/get-document-timeline.ts';

// Recording da trilha (Time Travel) — wiring application + in-memory:
//   document-repo e timeline-repo compartilham o MESMO store (atomicidade em memória,
//   espelha a tx única do MySQL). ClockFixed dá `occurredAt` determinístico.

const SUP = '11111111-1111-4111-8111-111111111111';
const USER = '22222222-2222-4222-8222-222222222222';
const CLOCK = ClockFixed(new Date('2026-06-15T12:00:00Z'));

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

const wire = () => {
  const timelineStore: TimelineStore = new Map<string, FinancialTimelineEntry[]>();
  const repo = createInMemoryDocumentRepository(timelineStore);
  const timelineRepo = createInMemoryTimelineRepository(timelineStore);
  const outbox = createInMemoryOutbox();
  const deps = {
    repo,
    outbox: outbox.port,
    clock: CLOCK,
    contractCategorizationReader: createInMemoryContractCategorizationReadStore(),
  };
  return {
    save: saveDocument(deps),
    approve: approveDocument(deps),
    readTimeline: getDocumentTimeline({ timelineRepo }),
  };
};

describe('financial/application — timeline recording', () => {
  it('saveDocument grava entry de criação (target Document, changes não-vazio)', async () => {
    const { save, readTimeline } = wire();

    const saved = await save(nfseCommand());
    assert.equal(saved.ok, true);
    if (!saved.ok) return;

    const timeline = await readTimeline({ documentId: saved.value.documentId });
    assert.equal(timeline.ok, true);
    if (!timeline.ok) return;

    assert.ok(timeline.value.length >= 1, 'esperava ao menos 1 entry de trilha');
    const documentEntry = timeline.value.find((e) => e.target.kind === 'Document');
    assert.ok(documentEntry !== undefined, 'esperava 1 entry com target.kind=Document');
    assert.ok(documentEntry.changes.length > 0, 'esperava changes não-vazio na criação');
  });

  it('approveDocument grava entry com change field=status after=Approved', async () => {
    const { save, approve, readTimeline } = wire();

    const saved = await save(nfseCommand());
    assert.equal(saved.ok, true);
    if (!saved.ok) return;

    const approved = await approve({
      documentId: saved.value.documentId,
      approvedBy: USER,
      expectedVersion: 0,
    });
    assert.equal(approved.ok, true);

    const timeline = await readTimeline({ documentId: saved.value.documentId });
    assert.equal(timeline.ok, true);
    if (!timeline.ok) return;

    const statusChange = timeline.value
      .flatMap((e) => e.changes)
      .find((c) => c.field === 'status' && c.after === 'Approved');
    assert.ok(
      statusChange !== undefined,
      'esperava change field=status after=Approved após aprovação',
    );
  });
});
