import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import { toTimelineEntry } from '#src/modules/contracts/domain/timeline/projection.ts';

// W0 RED — CTR-TIMELINE-READ-MODEL: mapeamento puro evento → TimelineEntry (CA-1).
// `kind` = event.type (EN); PT fica no formatter (pass 2). `contractId` é passado
// (resolvido pelo projetor). `subjectAmendmentId` derivado do próprio evento.

const D = (iso: string): Date => new Date(iso);
const user = () => {
  const r = UserRef.rehydrate('7f3a1234-5678-4abc-9def-fedcba987654');
  if (!r.ok) throw new Error('fixture broken');
  return r.value;
};

describe('toTimelineEntry — mapeamento por evento (CA-1)', () => {
  it('ContractCreated → kind ContractCreated, sem actor, sem subjectAmendmentId', () => {
    const contractId = ContractId.generate();
    const event: ContractsModuleEvent = {
      type: 'ContractCreated',
      contractId,
      occurredAt: D('2026-01-01'),
    };
    const entry = toTimelineEntry(event, 'evt-1', contractId);

    assert.equal(entry.kind, 'ContractCreated');
    assert.equal(entry.eventId, 'evt-1');
    assert.equal(entry.contractId, contractId);
    assert.equal(entry.occurredAt.getTime(), D('2026-01-01').getTime());
    assert.equal(entry.actor, null);
    assert.equal(entry.subjectAmendmentId, null);
  });

  it('ContractActivated → kind ContractActivated, sem actor, sem subjectAmendmentId', () => {
    const contractId = ContractId.generate();
    const event: ContractsModuleEvent = {
      type: 'ContractActivated',
      contractId,
      occurredAt: D('2026-03-15'),
    };
    const entry = toTimelineEntry(event, 'evt-act', contractId);

    assert.equal(entry.kind, 'ContractActivated');
    assert.equal(entry.contractId, contractId);
    assert.equal(entry.occurredAt.getTime(), D('2026-03-15').getTime());
    assert.equal(entry.actor, null);
    assert.equal(entry.subjectAmendmentId, null);
  });

  it('ContractEnded → kind ContractEnded', () => {
    const contractId = ContractId.generate();
    const event: ContractsModuleEvent = {
      type: 'ContractEnded',
      contractId,
      occurredAt: D('2026-12-31'),
      kind: 'Terminated',
    };
    const entry = toTimelineEntry(event, 'evt-2', contractId);
    assert.equal(entry.kind, 'ContractEnded');
    assert.equal(entry.actor, null);
  });

  it('AmendmentCreated → subjectAmendmentId = amendmentId do evento', () => {
    const contractId = ContractId.generate();
    const amendmentId = AmendmentId.generate();
    const event: ContractsModuleEvent = {
      type: 'AmendmentCreated',
      amendmentId,
      contractId,
      occurredAt: D('2026-03-01'),
    };
    const entry = toTimelineEntry(event, 'evt-3', contractId);
    assert.equal(entry.kind, 'AmendmentCreated');
    assert.equal(entry.subjectAmendmentId, amendmentId);
  });

  it('AmendmentHomologated → actor = homologatedBy, subjectAmendmentId set', () => {
    const contractId = ContractId.generate();
    const amendmentId = AmendmentId.generate();
    const by = user();
    const event: ContractsModuleEvent = {
      type: 'AmendmentHomologated',
      amendmentId,
      homologatedBy: by,
      occurredAt: D('2026-04-15'),
    };
    const entry = toTimelineEntry(event, 'evt-4', contractId);
    assert.equal(entry.kind, 'AmendmentHomologated');
    assert.equal(entry.actor, by);
    assert.equal(entry.subjectAmendmentId, amendmentId);
  });

  it('ContractDocumentDeleted (parent Contract) → actor = deletedBy', () => {
    const contractId = ContractId.generate();
    const event: ContractsModuleEvent = {
      type: 'ContractDocumentDeleted',
      documentId: DocumentId.generate(),
      parentType: 'Contract',
      parentId: contractId,
      deletedBy: user(),
      deletedReason: 'erro de digitação',
      occurredAt: D('2026-05-01'),
    };
    const entry = toTimelineEntry(event, 'evt-5', contractId);
    assert.equal(entry.kind, 'ContractDocumentDeleted');
    assert.notEqual(entry.actor, null);
    assert.equal(entry.subjectAmendmentId, null);
  });
});
