import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as NonZeroMoney from '#src/shared/kernel/non-zero-money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { Contract as ContractEntity } from '#src/modules/contracts/domain/contract/types.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { homologateAmendment } from '#src/modules/contracts/application/use-cases/homologate-amendment.ts';

// W0 RED — CTR-OUTBOX-INTEGRATION-IN-REPOS
// setup usa InMemoryOutbox injetado nos repos.
// deps NÃO contém mais eventBus.
// Assertions de evento inspecionam outbox.all() / outbox.pending().
// CA10 — homologateAmendment emite 2 eventos em saves separados.

const D = (iso: string): Date => new Date(iso);
const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};
const VALID_USER_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

const nonZeroMoney = (cents: number) => {
  const m = money(cents);
  const r = NonZeroMoney.from(m);
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`fixture broken: ${r.error}`);
  return r.value;
};

// ============================================================================
// Test harness — sets up world with active contract + pending amendment w/ doc
// ============================================================================

const setupWorld = async (
  overrides: {
    amendmentImpactCents?: number;
    contractValueCents?: number;
    contractIsExpired?: boolean;
  } = {},
) => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
  const clock = ClockFixed(D('2026-04-15'));

  // Create an active contract
  const contractCreate = Contract.create({
    id: ContractId.generate(),
    sequentialNumber: '001/2026',
    title: 'Cooperativa Bem Comum',
    objective: 'Aquisição de equipamentos',
    signedAt: D('2026-01-01'),
    originalValue: money(overrides.contractValueCents ?? 10000000),
    originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
  });
  if (!contractCreate.ok)
    throw new Error(`fixture broken: ${JSON.stringify(contractCreate.error)}`);
  // Tipa como union — pode evoluir para ExpiredContract via Contract.expire abaixo.
  let contract: ContractEntity = contractCreate.value.contract;

  if (overrides.contractIsExpired) {
    const expired = Contract.expire(contractCreate.value.contract, D('2027-01-01'));
    if (!expired.ok) throw new Error(`fixture broken: ${JSON.stringify(expired.error)}`);
    contract = expired.value.contract;
  }

  // save direto no repo (sem evento de setup poluindo o outbox do teste)
  await contractRepo.repo.save(contract, []);

  // Create a pending Addition amendment with signed document
  const amendmentCreate = Amendment.create({
    id: AmendmentId.generate(),
    contractId: contract.id,
    amendmentNumber: 'AD 01-001/2026',
    description: 'Ampliação de escopo',
    createdAt: D('2026-03-01'),
    kind: 'Addition',
    impactValue: nonZeroMoney(overrides.amendmentImpactCents ?? 500000),
  });
  if (!amendmentCreate.ok)
    throw new Error(`fixture broken: ${JSON.stringify(amendmentCreate.error)}`);
  const attached = Amendment.attachSignedDocument(
    amendmentCreate.value.amendment,
    DocumentId.generate(),
  );
  if (!attached.ok) throw new Error(`fixture broken: ${JSON.stringify(attached.error)}`);
  const amendment = attached.value.amendment;
  await amendmentRepo.repo.save(amendment, []);

  // Reseta o outbox após setup — só queremos os eventos do caso de uso testado
  outbox.clear();

  return {
    contract,
    amendment,
    contractRepo,
    amendmentRepo,
    outbox,
    clock,
  };
};

const deps = (world: Awaited<ReturnType<typeof setupWorld>>) => ({
  contractRepo: world.contractRepo.repo,
  amendmentRepo: world.amendmentRepo.repo,
  clock: world.clock,
});

// ============================================================================
// Happy path
// ============================================================================

describe('homologateAmendment — happy path (Addition)', () => {
  it('homologates amendment, updates contract value, appends 2 events to outbox', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;

    // Amendment is Homologated
    assert.equal(r.value.amendment.status, 'Homologated');
    assert.equal(r.value.amendment.homologatedAt?.getTime(), D('2026-04-15').getTime());

    // Contract value increased
    assert.equal(r.value.contract.currentValue.cents, 10500000);
    assert.equal(r.value.contract.homologatedAmendmentIds.length, 1);

    // 2 events returned in correct order
    assert.equal(r.value.events.length, 2);
    assert.equal(r.value.events[0]?.type, 'AmendmentHomologated');
    assert.equal(r.value.events[1]?.type, 'ContractStateUpdated');

    // Defeito #1 — payload de ContractStateUpdated carrega snapshot do novo estado
    const stateEvent = r.value.events[1];
    if (stateEvent?.type === 'ContractStateUpdated') {
      assert.equal(stateEvent.newCurrentValue.cents, 10500000);
      assert.equal(stateEvent.newCurrentPeriod.kind, 'Fixed');
    }

    // CA7 + CA10 — 2 eventos no outbox (1 por save)
    assert.equal(world.outbox.all().length, 2);
    assert.equal(world.outbox.all()[0]?.eventType, 'AmendmentHomologated');
    assert.equal(world.outbox.all()[1]?.eventType, 'ContractStateUpdated');
  });

  it('persists updated amendment and contract', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });

    const persistedAmendment = await world.amendmentRepo.repo.findById(world.amendment.id);
    if (!persistedAmendment.ok || persistedAmendment.value === null) {
      throw new Error('amendment not persisted');
    }
    assert.equal(persistedAmendment.value.status, 'Homologated');

    const persistedContract = await world.contractRepo.repo.findById(world.contract.id);
    if (!persistedContract.ok || persistedContract.value === null) {
      throw new Error('contract not persisted');
    }
    const persisted = persistedContract.value;
    if (persisted.status === 'Pending') throw new Error('expected effective contract');
    assert.equal(persisted.currentValue.cents, 10500000);
  });

  it('appends events to outbox in order: AmendmentHomologated then ContractStateUpdated', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });

    // CA7 — eventos no outbox, em ordem
    const rows = world.outbox.all();
    assert.equal(rows.length, 2);
    assert.equal(rows[0]?.eventType, 'AmendmentHomologated');
    assert.equal(rows[1]?.eventType, 'ContractStateUpdated');
  });
});

// ============================================================================
// Input validation
// ============================================================================

describe('homologateAmendment — input validation', () => {
  it('rejects invalid amendmentId', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: 'not-a-uuid',
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-id-invalid');
  });

  it('rejects invalid contractId', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: 'not-a-uuid',
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('rejects invalid homologatedBy', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: 'not-a-uuid',
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'user-ref-invalid');
  });
});

// ============================================================================
// Not found
// ============================================================================

describe('homologateAmendment — not found', () => {
  it('returns amendment-not-found when amendment does not exist', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: AmendmentId.generate() as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-not-found');
  });

  it('returns contract-not-found when contract does not exist', async () => {
    const world = await setupWorld();
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: ContractId.generate() as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });
});

// ============================================================================
// Mismatch
// ============================================================================

describe('homologateAmendment — mismatch', () => {
  it('rejects when amendment.contractId differs from passed contractId', async () => {
    const world = await setupWorld();

    // Create a second active contract (sem evento)
    const otherContract = Contract.create({
      id: ContractId.generate(),
      sequentialNumber: '002/2026',
      title: 'Outro contrato',
      objective: 'Outra coisa',
      signedAt: D('2026-01-01'),
      originalValue: money(5000000),
      originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
    });
    if (!otherContract.ok) throw new Error('fixture broken');
    await world.contractRepo.repo.save(otherContract.value.contract, []);

    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: otherContract.value.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-contract-mismatch');

    // Nothing should have been persisted as Homologated
    const a = await world.amendmentRepo.repo.findById(world.amendment.id);
    if (!a.ok || a.value === null) throw new Error('expected amendment');
    assert.equal(a.value.status, 'Pending');
  });
});

// ============================================================================
// Domain error propagation
// ============================================================================

describe('homologateAmendment — domain rule propagation', () => {
  it('propagates amendment-without-signed-document when no doc attached', async () => {
    const world = await setupWorld();

    // Create amendment WITHOUT signed document
    const createResult = Amendment.create({
      id: AmendmentId.generate(),
      contractId: world.contract.id,
      amendmentNumber: 'AD 02-001/2026',
      description: 'Sem doc',
      createdAt: D('2026-03-01'),
      kind: 'Addition',
      impactValue: nonZeroMoney(100000),
    });
    if (!createResult.ok) throw new Error('fixture broken');
    await world.amendmentRepo.repo.save(createResult.value.amendment, []);

    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: createResult.value.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    // CTR-DOMAIN-TAGGED-ERRORS — `AmendmentError` virou tagged record (D22).
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'AmendmentWithoutSignedDocument');
    }
  });

  it('propagates contract-not-active when contract is Expired', async () => {
    const world = await setupWorld({ contractIsExpired: true });
    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    // CTR-DOMAIN-TAGGED-ERRORS — `ContractError` virou tagged record (D22).
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractNotActive');
    }
  });

  it('propagates contract-value-would-go-negative for excessive Suppression', async () => {
    const world = await setupWorld({ contractValueCents: 1000000 });

    // Create a Suppression bigger than contract value
    const suppression = Amendment.create({
      id: AmendmentId.generate(),
      contractId: world.contract.id,
      amendmentNumber: 'AD 03-001/2026',
      description: 'Supressão grande',
      createdAt: D('2026-03-01'),
      kind: 'Suppression',
      impactValue: nonZeroMoney(2000000),
    });
    if (!suppression.ok) throw new Error('fixture broken');
    const attached = Amendment.attachSignedDocument(
      suppression.value.amendment,
      DocumentId.generate(),
    );
    if (!attached.ok) throw new Error('fixture broken');
    await world.amendmentRepo.repo.save(attached.value.amendment, []);

    const useCase = homologateAmendment(deps(world));
    const r = await useCase({
      amendmentId: attached.value.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    assert.equal(isErr(r), true);
    // CTR-DOMAIN-TAGGED-ERRORS — `ContractError` virou tagged record (D22).
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractValueWouldGoNegative');
    }
  });
});

// ============================================================================
// Side-effect isolation on error
// ============================================================================

describe('homologateAmendment — side effects on error', () => {
  it('does not append events to outbox when domain rule rejects', async () => {
    const world = await setupWorld({ contractIsExpired: true });
    const useCase = homologateAmendment(deps(world));
    await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    // CA7 — sem eventos no outbox quando há erro de domínio
    assert.equal(world.outbox.all().length, 0);
  });

  it('does not persist amendment-as-Homologated when contract rule rejects', async () => {
    const world = await setupWorld({ contractIsExpired: true });
    const useCase = homologateAmendment(deps(world));
    await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });
    const a = await world.amendmentRepo.repo.findById(world.amendment.id);
    if (!a.ok || a.value === null) throw new Error('expected amendment');
    assert.equal(a.value.status, 'Pending');
  });
});

// ============================================================================
// InMemory adapters behavior
// ============================================================================

describe('InMemoryContractRepository', () => {
  it('returns Ok(null) for unknown id', async () => {
    const outbox = InMemoryOutbox();
    const repo = InMemoryContractRepository(outbox.port);
    const r = await repo.repo.findById(ContractId.generate());
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, null);
  });

  it('persists and returns saved contract', async () => {
    const outbox = InMemoryOutbox();
    const repo = InMemoryContractRepository(outbox.port);
    const created = Contract.create({
      id: ContractId.generate(),
      sequentialNumber: '999/2026',
      title: 'T',
      objective: 'O',
      signedAt: D('2026-01-01'),
      originalValue: money(100),
      originalPeriod: fixedPeriod('2026-01-01', '2026-12-31'),
    });
    if (!created.ok) throw new Error('fixture broken');

    // CA1 — save aceita 2º argumento events
    await repo.repo.save(created.value.contract, []);
    const found = await repo.repo.findById(created.value.contract.id);
    assert.equal(isOk(found), true);
    if (found.ok && found.value !== null) {
      assert.equal(found.value.id, created.value.contract.id);
    }
  });
});

describe('InMemoryAmendmentRepository', () => {
  it('returns Ok(null) for unknown id', async () => {
    const outbox = InMemoryOutbox();
    const repo = InMemoryAmendmentRepository(outbox.port);
    const r = await repo.repo.findById(AmendmentId.generate());
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, null);
  });
});

describe('InMemoryOutbox', () => {
  it('captures appended events in order and exposes via all() and pending()', async () => {
    const outbox = InMemoryOutbox();
    const contractId = ContractId.generate();
    const amendmentId = AmendmentId.generate();
    const fixedPeriodValue = Period.create(pd('2026-01-01'), pd('2026-12-31'));
    if (!fixedPeriodValue.ok) throw new Error('fixture broken');
    const fixedMoneyValue = Money.fromCents(10000000);
    if (!fixedMoneyValue.ok) throw new Error('fixture broken');
    await outbox.port.append([
      {
        type: 'AmendmentHomologated',
        amendmentId,
        homologatedBy: UserRef.rehydrate(VALID_USER_UUID).ok
          ? ((UserRef.rehydrate(VALID_USER_UUID) as { ok: true; value: unknown }).value as never)
          : (() => {
              throw new Error('fixture broken');
            })(),
        occurredAt: D('2026-04-15'),
      },
      {
        type: 'ContractStateUpdated',
        contractId,
        amendmentId,
        occurredAt: D('2026-04-15'),
        newCurrentValue: fixedMoneyValue.value,
        newCurrentPeriod: fixedPeriodValue.value,
      },
    ]);
    const all = outbox.all();
    assert.equal(all.length, 2);
    assert.equal(all[0]?.eventType, 'AmendmentHomologated');
    assert.equal(all[1]?.eventType, 'ContractStateUpdated');

    const pending = outbox.pending();
    assert.equal(pending.length, 2);
  });

  it('clear() resets state', async () => {
    const outbox = InMemoryOutbox();
    await outbox.port.append([
      {
        type: 'AmendmentHomologated',
        amendmentId: AmendmentId.generate(),
        homologatedBy: AmendmentId.generate() as unknown as never,
        occurredAt: D('2026-04-15'),
      },
    ]);
    outbox.clear();
    assert.equal(outbox.all().length, 0);
  });
});

describe('ClockFixed', () => {
  it('always returns the same date', () => {
    const at = D('2026-06-15T12:00:00Z');
    const clock = ClockFixed(at);
    assert.equal(clock.now().getTime(), at.getTime());
    assert.equal(clock.now().getTime(), at.getTime());
  });
});
