import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import { InMemoryTimelineRepository } from '#src/modules/contracts/adapters/persistence/repos/timeline-repository.in-memory.ts';
import { TimelineProjectionDelivery } from '#src/modules/contracts/adapters/event-delivery/timeline-projection.delivery.ts';
import { getContractTimeline } from '#src/modules/contracts/application/use-cases/get-contract-timeline.ts';

// W0 RED — UC-08: getContractTimeline (CA-6).

const D = (iso: string): Date => new Date(iso);

describe('getContractTimeline (UC-08)', () => {
  it('CA-6: devolve a trilha do contrato em ordem cronológica', async () => {
    const repo = InMemoryTimelineRepository();
    const projector = TimelineProjectionDelivery(repo);
    const contractId = ContractId.generate();

    const events: readonly ContractsModuleEvent[] = [
      { type: 'ContractCreated', contractId, occurredAt: D('2026-01-01') },
      { type: 'ContractEnded', contractId, occurredAt: D('2026-12-31'), kind: 'Expired' },
    ];
    let i = 0;
    for (const event of events) {
      await projector.deliver({
        eventId: `e-${i++}`,
        eventType: event.type,
        schemaVersion: 1,
        event,
      });
    }

    const useCase = getContractTimeline({ timelineRepo: repo });
    const r = await useCase({ contractId: contractId as unknown as string });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.length, 2);
    assert.equal(r.value[0]?.kind, 'ContractCreated');
    assert.equal(r.value[1]?.kind, 'ContractEnded');
  });

  it('CA-6: contrato inexistente → trilha vazia', async () => {
    const repo = InMemoryTimelineRepository();
    const useCase = getContractTimeline({ timelineRepo: repo });

    const r = await useCase({ contractId: ContractId.generate() as unknown as string });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 0);
  });

  it('CA-6: contractId malformado → erro de validação', async () => {
    const repo = InMemoryTimelineRepository();
    const useCase = getContractTimeline({ timelineRepo: repo });

    const r = await useCase({ contractId: 'not-a-uuid' });
    assert.equal(r.ok, false);
  });
});
