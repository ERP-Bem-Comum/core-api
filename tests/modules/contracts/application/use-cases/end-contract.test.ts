import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { Contract as ContractEntity } from '#src/modules/contracts/domain/contract/types.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { endContract } from '#src/modules/contracts/application/use-cases/end-contract.ts';

// W0 RED — CTR-USECASE-END-CONTRACT (UC-07).
// endContract orquestra Contract.expire/terminate (domínio pronto) e publica
// ContractEnded via outbox no save. deps = { contractRepo, clock }.

const D = (iso: string): Date => new Date(iso);
const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const indefinitePeriod = (startISO: string) => Period.createIndefinite(pd(startISO));

// ============================================================================
// Test harness — mundo com um contrato Active (ou pré-encerrado) persistido
// ============================================================================

const setupWorld = async (
  opts: {
    clockAt?: string;
    periodStart?: string;
    periodEnd?: string | null; // null = Indefinite
    valueCents?: number;
    startStatus?: 'Active' | 'Expired' | 'Terminated';
  } = {},
) => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const clock = ClockFixed(D(opts.clockAt ?? '2027-01-01'));

  const periodEnd = opts.periodEnd === undefined ? '2026-12-31' : opts.periodEnd;
  const period =
    periodEnd === null
      ? indefinitePeriod(opts.periodStart ?? '2026-01-01')
      : fixedPeriod(opts.periodStart ?? '2026-01-01', periodEnd);

  const created = Contract.create({
    id: ContractId.generate(),
    sequentialNumber: '001/2026',
    title: 'Cooperativa Bem Comum',
    objective: 'Aquisição de equipamentos',
    signedAt: D('2026-01-01'),
    originalValue: money(opts.valueCents ?? 10000000),
    originalPeriod: period,
  });
  if (!created.ok) throw new Error(`fixture broken: ${JSON.stringify(created.error)}`);

  let contract: ContractEntity = created.value.contract;
  if (opts.startStatus === 'Expired') {
    const e = Contract.expire(created.value.contract, D('2027-06-01'));
    if (!e.ok) throw new Error(`fixture broken: ${JSON.stringify(e.error)}`);
    contract = e.value.contract;
  } else if (opts.startStatus === 'Terminated') {
    const t = Contract.terminate(created.value.contract, D('2026-06-01'));
    if (!t.ok) throw new Error(`fixture broken: ${JSON.stringify(t.error)}`);
    contract = t.value.contract;
  }

  await contractRepo.repo.save(contract, []);
  outbox.clear();

  return { contract, contractRepo, outbox, clock };
};

const deps = (world: Awaited<ReturnType<typeof setupWorld>>) => ({
  contractRepo: world.contractRepo.repo,
  clock: world.clock,
});

// ============================================================================
// CA-1 — Terminate (distrato) — happy path
// ============================================================================

describe('endContract — Terminate (distrato)', () => {
  it('CA-1: encerra contrato Active como Terminated com endedAt = clock.now()', async () => {
    const world = await setupWorld({ clockAt: '2026-06-01' });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Terminated');
    if (r.value.contract.status === 'Terminated') {
      assert.equal(r.value.contract.endedAt.getTime(), D('2026-06-01').getTime());
    }
    assert.equal(r.value.event.type, 'ContractEnded');
    if (r.value.event.type === 'ContractEnded') {
      assert.equal(r.value.event.kind, 'Terminated');
    }
  });

  it('CA-1: publica ContractEnded no outbox e persiste o novo estado', async () => {
    const world = await setupWorld({ clockAt: '2026-06-01' });
    const useCase = endContract(deps(world));

    await useCase({ contractId: world.contract.id as unknown as string, kind: 'Terminate' });

    assert.equal(world.outbox.all().length, 1);
    assert.equal(world.outbox.all()[0]?.eventType, 'ContractEnded');

    const persisted = await world.contractRepo.repo.findById(world.contract.id);
    if (!persisted.ok || persisted.value === null) throw new Error('contrato não persistido');
    assert.equal(persisted.value.status, 'Terminated');
  });
});

// ============================================================================
// CA-2 — Expire (chegada da data fim) — happy path
// ============================================================================

describe('endContract — Expire (chegada da data fim)', () => {
  it('CA-2: encerra contrato Active como Expired quando clock.now() >= data fim', async () => {
    const world = await setupWorld({ clockAt: '2027-01-01' }); // >= 2026-12-31
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Expire',
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Expired');
    assert.equal(r.value.event.type, 'ContractEnded');
    if (r.value.event.type === 'ContractEnded') {
      assert.equal(r.value.event.kind, 'Expired');
    }
    assert.equal(world.outbox.all().length, 1);
    assert.equal(world.outbox.all()[0]?.eventType, 'ContractEnded');
  });
});

// ============================================================================
// CA-3/CA-4 — propagação de regra de domínio do Expire
// ============================================================================

describe('endContract — Expire rejeitado por regra de domínio', () => {
  it('CA-3: antes da data fim propaga ContractCannotExpireYet, sem efeito colateral', async () => {
    const world = await setupWorld({ clockAt: '2026-06-01' }); // < 2026-12-31
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Expire',
    });

    assert.equal(isErr(r), true);
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractCannotExpireYet');
    }
    assert.equal(world.outbox.all().length, 0);
    const persisted = await world.contractRepo.repo.findById(world.contract.id);
    if (!persisted.ok || persisted.value === null) throw new Error('contrato sumiu');
    assert.equal(persisted.value.status, 'Active');
  });

  it('CA-4: período Indefinite propaga ContractCannotExpireIndefinitePeriod', async () => {
    const world = await setupWorld({ clockAt: '2027-01-01', periodEnd: null });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Expire',
    });

    assert.equal(isErr(r), true);
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractCannotExpireIndefinitePeriod');
    }
  });
});

// ============================================================================
// CA-5 — contrato já encerrado (terminal) → ContractNotActive
// ============================================================================

describe('endContract — contrato já encerrado', () => {
  it('CA-5: distratar contrato Terminated propaga ContractNotActive', async () => {
    const world = await setupWorld({ startStatus: 'Terminated', clockAt: '2026-12-31' });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
    });

    assert.equal(isErr(r), true);
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractNotActive');
    }
    assert.equal(world.outbox.all().length, 0);
  });

  it('CA-5: expirar contrato Expired propaga ContractNotActive', async () => {
    const world = await setupWorld({ startStatus: 'Expired', clockAt: '2027-12-31' });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Expire',
    });

    assert.equal(isErr(r), true);
    if (!r.ok && typeof r.error === 'object' && 'tag' in r.error) {
      assert.equal(r.error.tag, 'ContractNotActive');
    }
  });
});

// ============================================================================
// CA-6 — validação de input / not found
// ============================================================================

describe('endContract — input validation e not found', () => {
  it('CA-6: contractId malformado → contract-id-invalid', async () => {
    const world = await setupWorld();
    const useCase = endContract(deps(world));

    const r = await useCase({ contractId: 'not-a-uuid', kind: 'Terminate' });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('CA-6: contractId inexistente → contract-not-found', async () => {
    const world = await setupWorld();
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: ContractId.generate() as unknown as string,
      kind: 'Terminate',
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });
});
