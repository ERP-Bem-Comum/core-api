import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import type { Contract as ContractEntity } from '#src/modules/contracts/domain/contract/types.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import type { DocumentCategory } from '#src/modules/contracts/domain/document/types.ts';
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

const someContractor = (() => {
  const r = ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555');
  if (!r.ok) throw new Error('fixture broken: contractor');
  return r.value;
})();

// ============================================================================
// Test harness — mundo com um contrato Active (ou pré-encerrado) persistido
// ============================================================================

// Documento `signed_termination` Active vinculado ao contrato — pré-requisito do
// distrato (CTR-HTTP-DISTRATO-DOCUMENTO; espelha o `signed_contract` da ativação).
const signedTerminationDoc = (contractId: ContractId.ContractId) => {
  const r = Document.create({
    id: DocumentId.generate(),
    parentType: 'Contract',
    parentId: contractId,
    categoria: 'signed_termination' as DocumentCategory,
    fileName: 'distrato-assinado.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 5,
    hashSha256: 'a'.repeat(64),
    bucket: (() => {
      const b = createBucketName('contracts-documents');
      if (!b.ok) throw new Error('fixture broken: bucket');
      return b.value;
    })(),
    storageKey: (() => {
      const k = createStorageKey('contracts/2026/distrato-001.pdf');
      if (!k.ok) throw new Error('fixture broken: key');
      return k.value;
    })(),
    signedElectronically: true,
    version: 1,
    uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
    uploadedBy: (() => {
      const u = UserRef.rehydrate('44444444-4444-4444-8444-444444444444');
      if (!u.ok) throw new Error('fixture broken: userRef');
      return u.value;
    })(),
    retentionUntil: null,
  });
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value.document;
};

const setupWorld = async (
  opts: {
    clockAt?: string;
    periodStart?: string;
    periodEnd?: string | null; // null = Indefinite
    valueCents?: number;
    startStatus?: 'Active' | 'Expired' | 'Terminated';
    // default true — distrato exige documento `signed_termination` vinculado.
    withSignedTermination?: boolean;
  } = {},
) => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const documentRepo = InMemoryDocumentRepository(outbox.port);
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
    contractor: someContractor,
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

  // Distrato exige documento assinado vinculado — seed por default (desliga via opt).
  if (opts.withSignedTermination !== false) {
    await documentRepo.repo.save(signedTerminationDoc(created.value.contract.id), []);
  }
  outbox.clear();

  return { contract, contractRepo, documentRepo, outbox, clock };
};

const deps = (world: Awaited<ReturnType<typeof setupWorld>>) => ({
  contractRepo: world.contractRepo.repo,
  documentRepo: world.documentRepo.repo,
  clock: world.clock,
});

// ============================================================================
// CA-1 — Terminate (distrato) — happy path
// ============================================================================

describe('endContract — Terminate (distrato)', () => {
  it('CA-1: encerra contrato Active como Terminated com endedAt = terminatedAt informado', async () => {
    // clock 2026-08-01 > terminatedAt 2026-06-01 (passado): endedAt usa a data informada,
    // NÃO o clock now (CTR-HTTP-DISTRATO-DOCUMENTO, DIST-2).
    const world = await setupWorld({ clockAt: '2026-08-01' });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
      terminatedAt: '2026-06-01',
      reason: 'Distrato por acordo entre as partes',
    });

    assert.equal(isOk(r), true);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Terminated');
    if (r.value.contract.status === 'Terminated') {
      assert.equal(r.value.contract.endedAt.getTime(), D('2026-06-01').getTime());
      // CTR-HTTP-DISTRATO-DOCUMENTO: o motivo é persistido no agregado (opção c).
      assert.equal(r.value.contract.terminationReason, 'Distrato por acordo entre as partes');
    }
    assert.equal(r.value.event.type, 'ContractEnded');
    if (r.value.event.type === 'ContractEnded') {
      assert.equal(r.value.event.kind, 'Terminated');
      // O evento carrega o "porquê" (Vernon, IDDD cap.8) — timeline/auditoria.
      assert.equal(r.value.event.terminationReason, 'Distrato por acordo entre as partes');
    }
  });

  it('CA-1: publica ContractEnded no outbox e persiste o novo estado', async () => {
    const world = await setupWorld({ clockAt: '2026-08-01' });
    const useCase = endContract(deps(world));

    await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
      terminatedAt: '2026-06-01',
      reason: 'Distrato por acordo',
    });

    assert.equal(world.outbox.all().length, 1);
    assert.equal(world.outbox.all()[0]?.eventType, 'ContractEnded');

    const persisted = await world.contractRepo.repo.findById(world.contract.id);
    if (!persisted.ok || persisted.value === null) throw new Error('contrato não persistido');
    assert.equal(persisted.value.status, 'Terminated');
    if (persisted.value.status === 'Terminated') {
      assert.equal(persisted.value.terminationReason, 'Distrato por acordo');
    }
  });

  it('DIST-5: terminatedAt futuro -> terminate-invalid-date, sem efeito colateral', async () => {
    const world = await setupWorld({ clockAt: '2026-08-01' });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
      terminatedAt: '2099-01-01',
      reason: 'Data futura — deve rejeitar',
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'terminate-invalid-date');
    assert.equal(world.outbox.all().length, 0);
    const persisted = await world.contractRepo.repo.findById(world.contract.id);
    if (!persisted.ok || persisted.value === null) throw new Error('contrato sumiu');
    assert.equal(persisted.value.status, 'Active');
  });

  it('DIST-5: terminatedAt malformado -> terminate-invalid-date', async () => {
    const world = await setupWorld({ clockAt: '2026-08-01' });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
      terminatedAt: 'not-a-date',
      reason: 'Data malformada',
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'terminate-invalid-date');
  });

  it('DIST-4: sem documento signed_termination -> terminate-no-signed-document', async () => {
    const world = await setupWorld({ clockAt: '2026-08-01', withSignedTermination: false });
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: world.contract.id as unknown as string,
      kind: 'Terminate',
      terminatedAt: '2026-06-01',
      reason: 'Sem documento — deve rejeitar',
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'terminate-no-signed-document');
    assert.equal(world.outbox.all().length, 0);
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
      terminatedAt: '2026-06-01',
      reason: 'Distrato',
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

    const r = await useCase({
      contractId: 'not-a-uuid',
      kind: 'Terminate',
      terminatedAt: '2026-06-01',
      reason: 'Distrato',
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-id-invalid');
  });

  it('CA-6: contractId inexistente → contract-not-found', async () => {
    const world = await setupWorld();
    const useCase = endContract(deps(world));

    const r = await useCase({
      contractId: ContractId.generate() as unknown as string,
      kind: 'Terminate',
      terminatedAt: '2026-06-01',
      reason: 'Distrato',
    });

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });
});
