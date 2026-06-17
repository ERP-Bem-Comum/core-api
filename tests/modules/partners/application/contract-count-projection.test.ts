/**
 * PAR-CONTRACT-COUNT-READMODEL (US6b) — W0 (RED).
 *
 * Projeção do read-model de contagem de contratos por contraparte (consome o `ctr_outbox`
 * enriquecido pela US6a, via `contracts/public-api` `decodeContractContractorRefV1`). Contagem é
 * DELTA (+1/−1), então a idempotência é por `eventId` (Vernon, IDDD, p.412).
 *
 * DEVE FALHAR: `applyContractCountEvent` (partners/public-api) e `makeInMemoryContractCountStore`
 * (adapter) ainda não existem. GREEN quando o W1 entregar o store (applyDelta idempotente +
 * getCount), o use case de projeção e o decode via contrato de integração da US6a.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// RED: símbolos ainda inexistentes (W1 cria).
import { applyContractCountEvent } from '#src/modules/partners/public-api/index.ts';
import { makeInMemoryContractCountStore } from '#src/modules/partners/adapters/persistence/repos/contract-count-store.in-memory.ts';

const NOW = new Date('2026-06-17T12:00:00.000Z');
const CONTRACT_UUID = '11111111-1111-4111-8111-111111111111';
const CONTRACTOR_UUID = '22222222-2222-4222-8222-222222222222';

type Row = Readonly<{
  eventId: string;
  eventType: string;
  schemaVersion: number;
  payload: string;
  occurredAt: Date;
}>;

const row = (eventId: string, eventType: string, withContractor: boolean): Row => ({
  eventId,
  eventType,
  schemaVersion: 1,
  occurredAt: NOW,
  payload: JSON.stringify({
    contractId: CONTRACT_UUID,
    occurredAt: NOW.toISOString(),
    ...(withContractor ? { contractorRef: { type: 'collaborator', id: CONTRACTOR_UUID } } : {}),
  }),
});

const countOf = async (
  store: ReturnType<typeof makeInMemoryContractCountStore>,
): Promise<number> => {
  const r = await store.getCount(CONTRACTOR_UUID);
  assert.ok(r.ok, `getCount: ${r.ok ? '' : r.error}`);
  return r.ok ? r.value : -1;
};

describe('US6b — projeção da contagem de contratos por contraparte', () => {
  it('CA1: ContractCreated com contractorRef → +1', async () => {
    const store = makeInMemoryContractCountStore();
    await applyContractCountEvent({ store })(row('e1', 'ContractCreated', true));
    assert.equal(await countOf(store), 1);
  });

  it('CA2: idempotência por eventId — mesmo eventId 2x → +1', async () => {
    const store = makeInMemoryContractCountStore();
    await applyContractCountEvent({ store })(row('e1', 'ContractCreated', true));
    await applyContractCountEvent({ store })(row('e1', 'ContractCreated', true));
    assert.equal(await countOf(store), 1);
  });

  it('CA3: ContractEnded/ContractCancelled → -1', async () => {
    const store = makeInMemoryContractCountStore();
    await applyContractCountEvent({ store })(row('e1', 'ContractCreated', true));
    await applyContractCountEvent({ store })(row('e2', 'ContractEnded', true));
    assert.equal(await countOf(store), 0);
  });

  it('CA4: evento sem contractorRef (AmendmentCreated) → no-op', async () => {
    const store = makeInMemoryContractCountStore();
    await applyContractCountEvent({ store })(row('e1', 'AmendmentCreated', false));
    assert.equal(await countOf(store), 0);
  });
});
