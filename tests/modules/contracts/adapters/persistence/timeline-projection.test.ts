import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import type { ProcessedEvent } from '#src/modules/contracts/application/ports/event-delivery.ts';
import { InMemoryTimelineRepository } from '#src/modules/contracts/adapters/persistence/repos/timeline-repository.in-memory.ts';
import { TimelineProjectionDelivery } from '#src/modules/contracts/adapters/event-delivery/timeline-projection.delivery.ts';

// W0 RED — projetor da Timeline (EventDelivery) + repo in-memory. CA-2/3/4/5/7.

const D = (iso: string): Date => new Date(iso);
let seq = 0;
const envelope = (event: ContractsModuleEvent, eventId?: string): ProcessedEvent => ({
  eventId: eventId ?? `evt-${++seq}`,
  eventType: event.type,
  schemaVersion: 1,
  event,
});
const user = () => {
  const r = UserRef.rehydrate('7f3a1234-5678-4abc-9def-fedcba987654');
  if (!r.ok) throw new Error('fixture broken');
  return r.value;
};

describe('TimelineProjectionDelivery', () => {
  it('CA-2: projeta ContractCreated → listByContract retorna 1 entrada', async () => {
    const repo = InMemoryTimelineRepository();
    const projector = TimelineProjectionDelivery(repo);
    const contractId = ContractId.generate();

    const r = await projector.deliver(
      envelope({ type: 'ContractCreated', contractId, occurredAt: D('2026-01-01') }),
    );
    assert.equal(isOk(r), true);

    const list = await repo.listByContract(contractId);
    if (!list.ok) throw new Error('list falhou');
    assert.equal(list.value.length, 1);
    assert.equal(list.value[0]?.kind, 'ContractCreated');
  });

  it('CA-3: resolve amendmentId→contractId (AmendmentCreated antes de AmendmentHomologated)', async () => {
    const repo = InMemoryTimelineRepository();
    const projector = TimelineProjectionDelivery(repo);
    const contractId = ContractId.generate();
    const amendmentId = AmendmentId.generate();

    await projector.deliver(
      envelope({ type: 'AmendmentCreated', amendmentId, contractId, occurredAt: D('2026-03-01') }),
    );
    await projector.deliver(
      envelope({
        type: 'AmendmentHomologated',
        amendmentId,
        homologatedBy: user(),
        occurredAt: D('2026-04-15'),
      }),
    );

    const list = await repo.listByContract(contractId);
    if (!list.ok) throw new Error('list falhou');
    assert.equal(list.value.length, 2);
    assert.deepEqual(
      list.value.map((e) => e.kind),
      ['AmendmentCreated', 'AmendmentHomologated'],
    );
  });

  it('CA-4: mesmo eventId entregue 2× → 1 entrada (idempotente)', async () => {
    const repo = InMemoryTimelineRepository();
    const projector = TimelineProjectionDelivery(repo);
    const contractId = ContractId.generate();
    const ev = envelope(
      { type: 'ContractCreated', contractId, occurredAt: D('2026-01-01') },
      'evt-fixed',
    );

    await projector.deliver(ev);
    await projector.deliver(ev);

    const list = await repo.listByContract(contractId);
    if (!list.ok) throw new Error('list falhou');
    assert.equal(list.value.length, 1);
  });

  it('CA-5: listByContract ordena por occurredAt ascendente', async () => {
    const repo = InMemoryTimelineRepository();
    const projector = TimelineProjectionDelivery(repo);
    const contractId = ContractId.generate();

    await projector.deliver(
      envelope({
        type: 'ContractEnded',
        contractId,
        occurredAt: D('2026-12-31'),
        kind: 'Expired',
        terminationReason: null,
      }),
    );
    await projector.deliver(
      envelope({ type: 'ContractCreated', contractId, occurredAt: D('2026-01-01') }),
    );

    const list = await repo.listByContract(contractId);
    if (!list.ok) throw new Error('list falhou');
    assert.deepEqual(
      list.value.map((e) => e.kind),
      ['ContractCreated', 'ContractEnded'],
    );
  });

  it('CA-7: amendment não resolvido não quebra a entrega (skip)', async () => {
    const repo = InMemoryTimelineRepository();
    const projector = TimelineProjectionDelivery(repo);
    const amendmentId = AmendmentId.generate();

    // AmendmentHomologated sem AmendmentCreated prévio → contractId não resolve.
    const r = await projector.deliver(
      envelope({
        type: 'AmendmentHomologated',
        amendmentId,
        homologatedBy: user(),
        occurredAt: D('2026-04-15'),
      }),
    );
    assert.equal(isOk(r), true);

    const found = await repo.findContractIdByAmendment(amendmentId);
    if (found.ok) assert.equal(found.value, null);
  });
});
