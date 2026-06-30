/**
 * CTR-HTTP-CANCEL-PENDING — W0 (RED) — use case `cancelContract` (ADR-0039).
 *
 * DEVE FALHAR: o use case `cancel-contract.ts` ainda não existe. GREEN no W1.
 *
 * Fluxo: rehydrate id → fetch → parsePending → cancel → save(state + evento outbox).
 *   - Pendente → ok; contrato Cancelled; evento ContractCancelled no outbox (CA-4).
 *   - Não-Pendente (Active) → err ContractNotPending (CA-2 → 409 na borda).
 *   - Inexistente → err contract-not-found (CA-3 → 404 na borda).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk, isErr } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { cancelContract } from '#src/modules/contracts/application/use-cases/cancel-contract.ts';
import { buildPendingContract, buildContract } from '../../adapters/persistence/fixtures.ts';

const PENDING_ID = '99999999-9999-4999-8999-999999999999';
const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const MISSING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const setup = async () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(new Date('2026-03-20T12:00:00.000Z'));
  await contractRepo.repo.save(buildPendingContract({ id: PENDING_ID }), []);
  await contractRepo.repo.save(buildContract({ id: ACTIVE_ID }), []);
  return { outbox, contractRepo, deps: { contractRepo: contractRepo.repo, clock } };
};

describe('cancelContract — cancelamento de contrato Pendente', () => {
  it('cancela contrato Pendente e publica ContractCancelled no outbox', async () => {
    const { deps, outbox } = await setup();
    const r = await cancelContract(deps)({ contractId: PENDING_ID });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Cancelled');
    assert.equal(
      outbox.all().some((e) => e.eventType === 'ContractCancelled'),
      true,
    );
  });

  it('rejeita cancelar contrato Active → ContractNotPending', async () => {
    const { deps } = await setup();
    const r = await cancelContract(deps)({ contractId: ACTIVE_ID });
    assert.equal(isErr(r), true);
    if (!r.ok && typeof r.error === 'object' && r.error !== null && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractNotPending');
    }
  });

  it('contrato inexistente → contract-not-found', async () => {
    const { deps } = await setup();
    const r = await cancelContract(deps)({ contractId: MISSING_ID });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });
});
