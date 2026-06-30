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
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { Amendment } from '#src/modules/contracts/domain/amendment/amendment.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { homologateAmendment } from '#src/modules/contracts/application/use-cases/homologate-amendment.ts';

// W0 RED — CTR-AMENDMENT-CHRONOLOGY-R4 (04-aditivos-context.md:86).
// R4: não homologar aditivo com data retroativa ao início do Contrato Mãe.
// Âncora = contract.signedAt; data comparada = amendment.createdAt.
// Regra: rejeita se amendment.createdAt < contract.signedAt (igualdade passa).

const D = (iso: string): Date => new Date(iso);
const pd = (iso: string): PlainDate.PlainDate => {
  const r = PlainDate.from(iso.slice(0, 10));
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};
const VALID_USER_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

const money = (cents: number) => {
  const r = Money.fromCents(cents);
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const nonZeroMoney = (cents: number) => {
  const r = NonZeroMoney.from(money(cents));
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const fixedPeriod = (startISO: string, endISO: string) => {
  const r = Period.create(pd(startISO), pd(endISO));
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const someContractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fixture broken: contractor');
  return r.value;
})();

const setupWorld = async (opts: {
  contractSignedAt: string;
  amendmentCreatedAt: string;
  clockAt: string;
}) => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
  const clock = ClockFixed(D(opts.clockAt));

  const contractCreate = Contract.create({
    id: ContractId.generate(),
    sequentialNumber: '001/2026',
    title: 'Cooperativa Bem Comum',
    objective: 'Aquisição de equipamentos',
    signedAt: D(opts.contractSignedAt),
    originalValue: money(10000000),
    originalPeriod: fixedPeriod(opts.contractSignedAt, '2027-12-31'),
    contractor: someContractor,
  });
  if (!contractCreate.ok)
    throw new Error(`fixture broken: ${JSON.stringify(contractCreate.error)}`);
  const contract = contractCreate.value.contract;
  await contractRepo.repo.save(contract, []);

  const amendmentCreate = Amendment.create({
    id: AmendmentId.generate(),
    contractId: contract.id,
    amendmentNumber: 'AD 01-001/2026',
    description: 'Ampliação de escopo',
    createdAt: D(opts.amendmentCreatedAt),
    kind: 'Addition',
    impactValue: nonZeroMoney(500000),
  });
  if (!amendmentCreate.ok)
    throw new Error(`fixture broken: ${JSON.stringify(amendmentCreate.error)}`);
  const attached = Amendment.attachSignedDocument(
    amendmentCreate.value.amendment,
    DocumentId.generate(),
    new Date('2026-02-15'),
  );
  if (!attached.ok) throw new Error(`fixture broken: ${JSON.stringify(attached.error)}`);
  const amendment = attached.value.amendment;
  await amendmentRepo.repo.save(amendment, []);

  outbox.clear();

  return { contract, amendment, contractRepo, amendmentRepo, outbox, clock };
};

const deps = (world: Awaited<ReturnType<typeof setupWorld>>) => ({
  contractRepo: world.contractRepo.repo,
  amendmentRepo: world.amendmentRepo.repo,
  clock: world.clock,
});

describe('homologateAmendment — R4 cronologia (createdAt vs signedAt)', () => {
  it('CA-1: rejeita aditivo com createdAt anterior ao signedAt do contrato', async () => {
    const world = await setupWorld({
      contractSignedAt: '2026-06-01',
      amendmentCreatedAt: '2026-01-01', // retroativo
      clockAt: '2026-07-01',
    });
    const useCase = homologateAmendment(deps(world));

    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'amendment-retroactive-to-contract-start');

    // sem efeito colateral: amendment continua Pending e outbox vazio
    assert.equal(world.outbox.all().length, 0);
    const persisted = await world.amendmentRepo.repo.findById(world.amendment.id);
    if (!persisted.ok || persisted.value === null) throw new Error('amendment sumiu');
    assert.equal(persisted.value.status, 'Pending');
  });

  it('CA-2 (fronteira): createdAt === signedAt homologa normalmente', async () => {
    const world = await setupWorld({
      contractSignedAt: '2026-06-01',
      amendmentCreatedAt: '2026-06-01', // igual → passa
      clockAt: '2026-07-01',
    });
    const useCase = homologateAmendment(deps(world));

    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });

    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.amendment.status, 'Homologated');
  });

  it('CA-3: createdAt posterior ao signedAt homologa normalmente', async () => {
    const world = await setupWorld({
      contractSignedAt: '2026-01-01',
      amendmentCreatedAt: '2026-03-01',
      clockAt: '2026-04-15',
    });
    const useCase = homologateAmendment(deps(world));

    const r = await useCase({
      amendmentId: world.amendment.id as unknown as string,
      contractId: world.contract.id as unknown as string,
      homologatedBy: VALID_USER_UUID,
    });

    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.amendment.status, 'Homologated');
  });
});
