/**
 * CTR-AMENDMENT-SIGNEDAT-AND-NUMBER — W0 (RED) — G3: número do aditivo gerado pelo backend.
 *
 * DEVE FALHAR: hoje `createAmendment` exige `amendmentNumber` no command. GREEN no W1, quando o
 * backend gera `NN/AAAA` por ORDEM DE CRIAÇÃO dentro do contrato (escopo per-contract; ano do clock).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createAmendment } from '#src/modules/contracts/application/use-cases/create-amendment.ts';
import { buildContract } from '../../adapters/persistence/fixtures.ts';

const CONTRACT_A = '11111111-1111-4111-8111-111111111111';
const CONTRACT_B = '22222222-2222-4222-8222-222222222222';

const setup = async () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
  const clock = ClockFixed(new Date('2026-03-01'));
  await contractRepo.repo.save(buildContract({ id: CONTRACT_A, sequentialNumber: '001/2026' }), []);
  await contractRepo.repo.save(buildContract({ id: CONTRACT_B, sequentialNumber: '002/2026' }), []);
  return { deps: { contractRepo: contractRepo.repo, amendmentRepo: amendmentRepo.repo, clock } };
};

// Command SEM amendmentNumber — o backend gera (removido do body do POST).
const cmdMisc = (contractId: string) => ({
  contractId,
  description: 'Ajuste',
  kind: 'Misc' as const,
});

describe('createAmendment — número gerado por contrato (G3)', () => {
  it('gera amendmentNumber NN/AAAA (ano do clock) quando ausente', async () => {
    const { deps } = await setup();
    const r = await createAmendment(deps)(cmdMisc(CONTRACT_A));
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.match(r.value.amendment.amendmentNumber, /^\d{2}\/2026$/);
  });

  it('crescente por contrato: 01/2026 depois 02/2026', async () => {
    const { deps } = await setup();
    const r1 = await createAmendment(deps)(cmdMisc(CONTRACT_A));
    const r2 = await createAmendment(deps)(cmdMisc(CONTRACT_A));
    assert.equal(isOk(r1), true);
    assert.equal(isOk(r2), true);
    if (r1.ok) assert.equal(r1.value.amendment.amendmentNumber, '01/2026');
    if (r2.ok) assert.equal(r2.value.amendment.amendmentNumber, '02/2026');
  });

  it('escopo per-contract: outro contrato reinicia em 01/2026', async () => {
    const { deps } = await setup();
    await createAmendment(deps)(cmdMisc(CONTRACT_A)); // 01/2026 no contrato A
    const rB = await createAmendment(deps)(cmdMisc(CONTRACT_B));
    assert.equal(isOk(rB), true);
    if (rB.ok) assert.equal(rB.value.amendment.amendmentNumber, '01/2026');
  });
});
