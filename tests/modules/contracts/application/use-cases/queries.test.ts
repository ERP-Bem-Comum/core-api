import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/contract-repository.in-memory.ts';
import { InMemoryEventBus } from '#src/modules/contracts/adapters/event-bus.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';
import { listContracts } from '#src/modules/contracts/application/use-cases/list-contracts.ts';
import { getContract } from '#src/modules/contracts/application/use-cases/get-contract.ts';
import { ContractId } from '#src/modules/contracts/domain/shared/ids.ts';

const setupWithContracts = async (n: number) => {
  const contractRepo = InMemoryContractRepository();
  const eventBus = InMemoryEventBus();
  const clock = ClockFixed(new Date('2026-01-01'));
  const create = createContract({
    contractRepo: contractRepo.repo,
    eventBus: eventBus.bus,
    clock,
  });

  const created = [];
  for (let i = 1; i <= n; i++) {
    const r = await create({
      sequentialNumber: `${String(i).padStart(3, '0')}/2026`,
      title: `Contrato ${i}`,
      objective: 'X',
      signedAt: '2026-01-01',
      originalValueCents: 1000000 * i,
      originalPeriodStart: '2026-01-01',
      originalPeriodEnd: '2026-12-31',
    });
    if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
    created.push(r.value.contract);
  }

  return { contractRepo, contracts: created };
};

describe('listContracts', () => {
  it('returns empty array when no contracts exist', async () => {
    const repo = InMemoryContractRepository();
    const r = await listContracts({ contractRepo: repo.repo })();
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 0);
  });

  it('returns all contracts when present', async () => {
    const w = await setupWithContracts(3);
    const r = await listContracts({ contractRepo: w.contractRepo.repo })();
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 3);
  });
});

describe('getContract', () => {
  it('returns Contract by id', async () => {
    const w = await setupWithContracts(1);
    const target = w.contracts[0];
    if (target === undefined) throw new Error('fixture broken');

    const r = await getContract({ contractRepo: w.contractRepo.repo })({
      contractId: target.id as unknown as string,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.id, target.id);
  });

  it('returns contract-not-found when id does not exist', async () => {
    const repo = InMemoryContractRepository();
    const r = await getContract({ contractRepo: repo.repo })({
      contractId: ContractId.generate() as unknown as string,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });

  it('returns contract-id-invalid for malformed id', async () => {
    const repo = InMemoryContractRepository();
    const r = await getContract({ contractRepo: repo.repo })({
      contractId: 'not-a-uuid',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });
});
