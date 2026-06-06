/**
 * W0 (RED) — CTR-USECASE-ACTIVATE-CONTRACT
 *
 * Use case de ativação (`Pending → Active`, RN-CV-02). Só ativa um contrato
 * `Pending` quando há documento `signed_contract` `Active` vinculado.
 *
 * Estes testes DEVEM FALHAR no W0 — `activateContract` ainda não existe
 * (`use-cases/activate-contract.ts`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import { activateContract } from '#src/modules/contracts/application/use-cases/activate-contract.ts';

const USER_UUID = '66666666-6666-4666-8666-666666666666';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const money = (cents: number) => fromOk(Money.fromCents(cents), 'money');
const pd = (iso: string) => fromOk(PlainDate.from(iso.slice(0, 10)), 'pd');
const someContractor = fromOk(
  ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555'),
  'contractor',
);
const fixedPeriod = (s: string, e: string) => fromOk(Period.create(pd(s), pd(e)), 'period');

const signedContractDoc = (contractId: string) =>
  fromOk(
    Document.create({
      id: DocumentId.generate(),
      parentType: 'Contract',
      parentId: fromOk(ContractId.rehydrate(contractId), 'contractId'),
      categoria: 'signed_contract',
      fileName: 'contrato-assinado.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5,
      hashSha256: 'a'.repeat(64),
      bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
      storageKey: fromOk(createStorageKey('contracts/2026/contrato-001.pdf'), 'key'),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
      uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
      retentionUntil: null,
    }),
    'document',
  ).document;

const setup = () => {
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const documentRepo = InMemoryDocumentRepository(outbox.port);
  return { outbox, contractRepo, documentRepo };
};

const seedPending = () => {
  const r = Contract.createPending({
    id: ContractId.generate(),
    sequentialNumber: '001/2026',
    title: 'Contrato Pendente',
    objective: 'Aguardando assinatura',
    originalValue: money(10_000_000),
    originalPeriod: fixedPeriod('2026-02-01', '2026-12-31'),
    contractor: someContractor,
    createdAt: new Date('2026-01-10T00:00:00.000Z'),
  });
  return fromOk(r, 'createPending').contract;
};

describe('activateContract — Pending → Active (RN-CV-02)', () => {
  it('CA1: Pending + documento signed_contract Active → ativa e persiste', async () => {
    const { contractRepo, documentRepo } = setup();
    const pending = seedPending();
    await contractRepo.repo.save(pending, []);
    await documentRepo.repo.save(signedContractDoc(pending.id as unknown as string), []);

    const r = await activateContract({
      contractRepo: contractRepo.repo,
      documentRepo: documentRepo.repo,
    })({ contractId: pending.id as unknown as string, signedAt: '2026-02-01' });

    assert.equal(isOk(r), true, `esperado ok; erro: ${JSON.stringify(!r.ok && r.error)}`);
    if (!r.ok) return;
    assert.equal(r.value.contract.status, 'Active');

    const persisted = await contractRepo.repo.findById(pending.id);
    if (!persisted.ok || persisted.value === null) throw new Error('não persistido');
    assert.equal(persisted.value.status, 'Active');
  });

  it('CA2a: contrato inexistente → contract-not-found', async () => {
    const { contractRepo, documentRepo } = setup();
    const r = await activateContract({
      contractRepo: contractRepo.repo,
      documentRepo: documentRepo.repo,
    })({ contractId: ContractId.generate() as unknown as string, signedAt: '2026-02-01' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-found');
  });

  it('CA2b: contrato não-Pending (já Active) → contract-not-pending', async () => {
    const { contractRepo, documentRepo } = setup();
    const active = fromOk(
      Contract.create({
        id: ContractId.generate(),
        sequentialNumber: '002/2026',
        title: 'Já ativo',
        objective: 'x',
        signedAt: new Date('2026-01-15'),
        originalValue: money(5_000_000),
        originalPeriod: fixedPeriod('2026-02-01', '2026-12-31'),
        contractor: someContractor,
      }),
      'create',
    ).contract;
    await contractRepo.repo.save(active, []);

    const r = await activateContract({
      contractRepo: contractRepo.repo,
      documentRepo: documentRepo.repo,
    })({ contractId: active.id as unknown as string, signedAt: '2026-02-01' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'contract-not-pending');
  });

  it('CA3: sem documento signed_contract Active → activate-contract-no-signed-document', async () => {
    const { contractRepo, documentRepo } = setup();
    const pending = seedPending();
    await contractRepo.repo.save(pending, []);
    // NÃO salva documento assinado.

    const r = await activateContract({
      contractRepo: contractRepo.repo,
      documentRepo: documentRepo.repo,
    })({ contractId: pending.id as unknown as string, signedAt: '2026-02-01' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'activate-contract-no-signed-document');
  });
});
