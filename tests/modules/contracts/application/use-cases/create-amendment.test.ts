import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/amendment-repository.in-memory.ts';
import { InMemoryEventBus } from '#src/modules/contracts/adapters/event-bus.in-memory.ts';
import { createContract } from '#src/modules/contracts/application/use-cases/create-contract.ts';
import { createAmendment } from '#src/modules/contracts/application/use-cases/create-amendment.ts';
import { ContractId } from '#src/modules/contracts/domain/shared/ids.ts';

const setupWithContract = async () => {
  const contractRepo = InMemoryContractRepository();
  const amendmentRepo = InMemoryAmendmentRepository();
  const eventBus = InMemoryEventBus();
  const clock = ClockFixed(new Date('2026-03-01'));

  const created = await createContract({
    contractRepo: contractRepo.repo,
    eventBus: eventBus.bus,
    clock,
  })({
    sequentialNumber: '001/2026',
    title: 'X',
    objective: 'O',
    signedAt: '2026-01-01',
    originalValueCents: 10000000,
    originalPeriodStart: '2026-01-01',
    originalPeriodEnd: '2026-12-31',
  });
  if (!created.ok) throw new Error(`fixture broken: ${created.error}`);

  eventBus.clear();

  return {
    contract: created.value.contract,
    contractRepo,
    amendmentRepo,
    eventBus,
    clock,
    deps: {
      contractRepo: contractRepo.repo,
      amendmentRepo: amendmentRepo.repo,
      eventBus: eventBus.bus,
      clock,
    },
  };
};

describe('createAmendment — happy path (Addition)', () => {
  it('creates Pending Addition amendment for an existing contract', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 01-001/2026',
      description: 'Ampliação',
      kind: 'Addition',
      impactValueCents: 500000,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.status, 'Pending');
    assert.equal(r.value.amendment.kind, 'Addition');
    if (r.value.amendment.kind === 'Addition') {
      assert.equal(r.value.amendment.impactValue.cents, 500000);
    }
    assert.equal(r.value.amendment.signedDocumentRef, null);
    assert.equal(r.value.event.type, 'AmendmentCreated');
    assert.equal(w.amendmentRepo.store().length, 1);
    assert.equal(w.eventBus.published().length, 1);
  });
});

describe('createAmendment — happy path (TermChange)', () => {
  it('creates Pending TermChange with newEndDate', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 02-001/2026',
      description: 'Prazo',
      kind: 'TermChange',
      newEndDate: '2027-06-30',
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.kind, 'TermChange');
  });
});

describe('createAmendment — happy path (Misc)', () => {
  it('creates Pending Misc without value or new date', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 03-001/2026',
      description: 'Cláusula adicional',
      kind: 'Misc',
    });
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.amendment.kind, 'Misc');
  });
});

describe('createAmendment — validations', () => {
  it('rejects invalid contractId', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: 'not-a-uuid',
      amendmentNumber: 'AD 01-001/2026',
      description: 'X',
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('returns contract-not-found when contract does not exist', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: ContractId.generate() as unknown as string,
      amendmentNumber: 'AD 01-001/2026',
      description: 'X',
      kind: 'Misc',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });

  it('rejects invalid newEndDate for TermChange', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 02-001/2026',
      description: 'X',
      kind: 'TermChange',
      newEndDate: 'not-a-date',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-amendment-invalid-new-end-date');
  });

  it('propagates amendment-impact-value-zero', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 01-001/2026',
      description: 'X',
      kind: 'Addition',
      impactValueCents: 0,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-impact-value-zero');
  });
});

describe('createAmendment — side effects on error', () => {
  it('does not persist amendment on error', async () => {
    const w = await setupWithContract();
    await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: '',
      description: 'X',
      kind: 'Misc',
    });
    assert.equal(w.amendmentRepo.store().length, 0);
    assert.equal(w.eventBus.published().length, 0);
  });
});

// Defeito #11 — TermChange retroativo detectado na criação (fail-fast)
describe('createAmendment — TermChange fail-fast (Defeito #11)', () => {
  it('rejects newEndDate <= currentPeriod.end on creation (not at homologation)', async () => {
    const w = await setupWithContract();
    // currentPeriod do contrato setup: 2026-01-01 a 2026-12-31
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 04-001/2026',
      description: 'Prazo retroativo',
      kind: 'TermChange',
      newEndDate: '2026-06-15', // antes do end atual
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-amendment-term-change-not-extending');
    assert.equal(w.amendmentRepo.store().length, 0);
  });

  it('rejects newEndDate equal to currentPeriod.end on creation', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 04-001/2026',
      description: 'Mesmo prazo',
      kind: 'TermChange',
      newEndDate: '2026-12-31',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'create-amendment-term-change-not-extending');
  });

  it('accepts newEndDate after currentPeriod.end', async () => {
    const w = await setupWithContract();
    const r = await createAmendment(w.deps)({
      contractId: w.contract.id as unknown as string,
      amendmentNumber: 'AD 04-001/2026',
      description: 'Prazo estendido',
      kind: 'TermChange',
      newEndDate: '2027-06-30',
    });
    assert.equal(isOk(r), true);
  });
});
