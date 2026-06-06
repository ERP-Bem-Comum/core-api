import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';

// W0 RED — CTR-OUTBOX-INTEGRATION-IN-REPOS
// setup usa InMemoryOutbox + InMemoryContractRepository(outbox.port).
// deps NÃO contém mais eventBus — use case não publica via EventBus.
// Assertions de evento inspecionam outbox.all() / outbox.pending().

const setup = () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(new Date('2026-01-01'));
  return {
    contractRepo,
    outbox,
    clock,
    deps: { contractRepo: contractRepo.repo, clock },
  };
};

const validCommand = {
  sequentialNumber: '001/2026',
  title: 'Cooperativa Bem Comum',
  objective: 'Aquisição de equipamentos',
  signedAt: '2026-01-01',
  originalValueCents: 10000000,
  originalPeriodStart: '2026-01-01',
  originalPeriodEnd: '2026-12-31',
  contractorType: 'supplier',
  contractorId: '55555555-5555-4555-8555-555555555555',
};

describe('createContract — happy path', () => {
  it('creates Active Contract with Fixed period and appends event to outbox', async () => {
    const { deps, contractRepo, outbox } = setup();
    const r = await createContract(deps)(validCommand);

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Active');
    assert.equal(r.value.contract.currentValue.cents, 10000000);
    assert.equal(r.value.contract.currentPeriod.kind, 'Fixed');
    assert.equal(r.value.event.type, 'ContractCreated');

    assert.equal(contractRepo.store().length, 1);
    // CA7 — evento vai para o outbox, não para um EventBus separado
    assert.equal(outbox.all().length, 1);
    assert.equal(outbox.pending().length, 1);
    assert.equal(outbox.all()[0]?.eventType, 'ContractCreated');
  });

  it('creates Contract with Indefinite period when originalPeriodEnd is null', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({
      ...validCommand,
      originalPeriodEnd: null,
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.currentPeriod.kind, 'Indefinite');
  });

  it('generates a unique ContractId for each invocation', async () => {
    const { deps } = setup();
    const r1 = await createContract(deps)(validCommand);
    const r2 = await createContract(deps)({
      ...validCommand,
      sequentialNumber: '002/2026',
    });
    if (!r1.ok || !r2.ok) throw new Error('fixture broken');
    assert.notEqual(r1.value.contract.id, r2.value.contract.id);
  });
});

describe('createContract — date validations', () => {
  it('rejects invalid signedAt', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({ ...validCommand, signedAt: 'not-a-date' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-contract-invalid-signed-at');
  });

  it('rejects invalid originalPeriodStart', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({
      ...validCommand,
      originalPeriodStart: 'not-a-date',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-contract-invalid-period-start');
  });

  it('rejects invalid originalPeriodEnd (non-null)', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({
      ...validCommand,
      originalPeriodEnd: 'not-a-date',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-contract-invalid-period-end');
  });
});

describe('createContract — domain error propagation', () => {
  it('propagates money-negative-value', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({ ...validCommand, originalValueCents: -1 });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-negative-value');
  });

  it('propagates money-non-integer-value', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({ ...validCommand, originalValueCents: 1.5 });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'money-non-integer-value');
  });

  it('propagates period-end-before-start', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({
      ...validCommand,
      originalPeriodStart: '2026-12-31',
      originalPeriodEnd: '2026-01-01',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-end-before-start');
  });

  it('propagates contract-sequential-number-required', async () => {
    const { deps } = setup();
    const r = await createContract(deps)({ ...validCommand, sequentialNumber: '' });
    assert.equal(isErr(r), true);
    // CTR-DOMAIN-TAGGED-ERRORS — `ContractError` virou tagged record (D22).
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractSequentialNumberRequired');
    }
  });
});

describe('createContract — side effects on error', () => {
  it('does not persist or append to outbox on validation error', async () => {
    const { deps, contractRepo, outbox } = setup();
    await createContract(deps)({ ...validCommand, originalValueCents: -1 });
    assert.equal(contractRepo.store().length, 0);
    // CA7 — sem evento no outbox quando há erro
    assert.equal(outbox.all().length, 0);
  });
});

// Defeito #5 — unicidade de sequentialNumber
describe('createContract — sequentialNumber uniqueness', () => {
  it('rejects 2nd contract with same sequentialNumber', async () => {
    const { deps, contractRepo } = setup();
    const r1 = await createContract(deps)(validCommand);
    assert.equal(isOk(r1), true);

    const r2 = await createContract(deps)({ ...validCommand, title: 'Outro título' });
    assert.equal(isErr(r2), true);
    if (!r2.ok) assert.equal(r2.error, 'contract-sequential-number-duplicated');

    // Apenas o primeiro foi persistido
    assert.equal(contractRepo.store().length, 1);
  });

  it('allows different sequentialNumbers in sequence', async () => {
    const { deps, contractRepo } = setup();
    const r1 = await createContract(deps)({ ...validCommand, sequentialNumber: '001/2026' });
    const r2 = await createContract(deps)({ ...validCommand, sequentialNumber: '002/2026' });
    assert.equal(isOk(r1), true);
    assert.equal(isOk(r2), true);
    assert.equal(contractRepo.store().length, 2);
  });
});
