/**
 * W0 (RED) - Tests para uploadDocument use case.
 *
 * Ticket: CTR-USECASE-UPLOAD-DOCUMENT.
 *
 * Cobre CA-U1..U6:
 *   U1 - happy path: ok com document + event
 *   U2 - parent inexistente -> parent-not-found
 *   U3 - storage.upload falha -> propagado
 *   U4 - documentRepo.save falha -> propagado
 *   U5 - fileName vazio -> ContractDocumentError 'document-invalid-file-name'
 *   U6 - storage retorna storage-integrity-mismatch (corrupcao em transit) -> propagado
 *
 * Estes tests DEVEM FALHAR em W0 - upload-document.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { uploadDocument } from '#src/modules/contracts/application/use-cases/upload-document.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { createInMemoryDocumentStorage } from '#src/modules/contracts/adapters/storage/document-storage.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import type {
  DocumentStorage,
  UploadInput,
} from '#src/modules/contracts/application/ports/document-storage.ts';
import type { StorageRef } from '#src/modules/contracts/application/ports/document-storage.types.ts';
import type { DocumentRepository } from '#src/modules/contracts/domain/document/repository.ts';
import type { ContractDocument } from '#src/modules/contracts/domain/document/types.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';
import { ok, err } from '#src/shared/primitives/result.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

const CONTRACT_UUID = '44444444-4444-4444-8444-444444444444';
const USER_UUID = '55555555-5555-4555-8555-555555555555';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const pd = (iso: string) => fromOk(PlainDate.from(iso), 'plainDate');

const setupWorld = async (overrides?: {
  storage?: DocumentStorage;
  documentRepo?: DocumentRepository;
}) => {
  const clock: Clock = ClockFixed(new Date('2026-05-22T12:00:00.000Z'));
  const outbox = InMemoryOutbox();
  const contractRepo = InMemoryContractRepository(outbox.port);
  const amendmentRepo = InMemoryAmendmentRepository(outbox.port);
  const documentRepo = overrides?.documentRepo ?? InMemoryDocumentRepository(outbox.port).repo;
  const storage = overrides?.storage ?? createInMemoryDocumentStorage();

  // Cria contract para servir de parent valido.
  const contractId = fromOk(ContractId.rehydrate(CONTRACT_UUID), 'contractId');
  const moneyR = Money.fromCents(100_000);
  const periodR = Period.create(pd('2026-01-01'), pd('2026-12-31'));
  if (!moneyR.ok || !periodR.ok) throw new Error('fixture money/period');
  const created = Contract.create({
    id: contractId,
    sequentialNumber: '001/2026',
    title: 'Contrato Teste',
    objective: 'Teste',
    signedAt: new Date('2026-01-01T00:00:00.000Z'),
    originalValue: moneyR.value,
    originalPeriod: periodR.value,
    contractor: fromOk(
      ContractorRef.make('supplier', '55555555-5555-4555-8555-555555555555'),
      'contractor',
    ),
  });
  if (!created.ok) throw new Error('fixture contract create');
  await contractRepo.repo.save(created.value.contract, []);

  return {
    deps: {
      clock,
      storage,
      documentRepo,
      contractRepo: contractRepo.repo,
      amendmentRepo: amendmentRepo.repo,
    },
    outbox,
  };
};

const baseCmd = () => ({
  parentType: 'Contract' as const,
  parentId: CONTRACT_UUID,
  categoria: 'signed_contract' as const,
  fileName: 'contrato-001.pdf',
  mimeType: 'application/pdf',
  bytes: new Uint8Array([72, 73, 74, 75, 76]), // "HIJKL"
  signedElectronically: true,
  uploadedBy: USER_UUID,
  retentionUntil: null,
  bucket: 'contracts-documents',
  storageKeyPrefix: 'contracts/2026',
});

describe('uploadDocument', () => {
  it('CA-U1: happy path retorna ok com document + event', async () => {
    const { deps } = await setupWorld();
    const r = await uploadDocument(deps)(baseCmd());
    assert.equal(r.ok, true, `esperado ok; obtido: ${JSON.stringify(r)}`);
    if (r.ok) {
      assert.equal(r.value.document.fileName, 'contrato-001.pdf');
      assert.equal(r.value.document.parentType, 'Contract');
      assert.equal(r.value.document.sizeBytes, 5);
      assert.equal(r.value.document.signedElectronically, true);
      assert.equal(r.value.document.status, 'Active');
      assert.equal(r.value.event.type, 'ContractDocumentAttached');
      assert.equal(r.value.event.documentId, r.value.document.id);
      assert.equal(
        r.value.document.uploadedAt.toISOString(),
        '2026-05-22T12:00:00.000Z',
        'uploadedAt deve vir de clock.now()',
      );
    }
  });

  it('CA-U2: parent inexistente retorna parent-not-found', async () => {
    const { deps } = await setupWorld();
    const cmd = { ...baseCmd(), parentId: '99999999-9999-4999-8999-999999999999' };
    const r = await uploadDocument(deps)(cmd);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'parent-not-found');
  });

  it('CA-U3: storage.upload falha retorna error propagado', async () => {
    const failingStorage: DocumentStorage = {
      // eslint-disable-next-line @typescript-eslint/require-await
      upload: async (_input: UploadInput) => err('storage-upload-failed'),
      // eslint-disable-next-line @typescript-eslint/require-await
      download: async (_ref: StorageRef) => err('storage-not-found'),
      // eslint-disable-next-line @typescript-eslint/require-await
      exists: async (_ref: StorageRef) => ok(false),
      // eslint-disable-next-line @typescript-eslint/require-await
      signedUrl: async (_ref: StorageRef, _ttl: number) => err('storage-unavailable'),
    };
    const { deps } = await setupWorld({ storage: failingStorage });
    const r = await uploadDocument(deps)(baseCmd());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'storage-upload-failed');
  });

  it('CA-U4: documentRepo.save falha retorna error propagado', async () => {
    const failingRepo: DocumentRepository = {
      // eslint-disable-next-line @typescript-eslint/require-await
      findById: async () => ok(null),
      // eslint-disable-next-line @typescript-eslint/require-await
      findByParent: async () => ok([]),
      // eslint-disable-next-line @typescript-eslint/require-await
      save: async (_doc: ContractDocument, _events: readonly ContractsModuleEvent[]) =>
        err('document-repository-unavailable'),
    };
    const { deps } = await setupWorld({ documentRepo: failingRepo });
    const r = await uploadDocument(deps)(baseCmd());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-repository-unavailable');
  });

  it('CA-U5: fileName vazio retorna document-invalid-file-name', async () => {
    const { deps } = await setupWorld();
    const cmd = { ...baseCmd(), fileName: '' };
    const r = await uploadDocument(deps)(cmd);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'document-invalid-file-name');
  });

  it('CA-U6: storage.upload integrity-mismatch retorna error propagado', async () => {
    const corruptStorage: DocumentStorage = {
      // eslint-disable-next-line @typescript-eslint/require-await
      upload: async () => err('storage-integrity-mismatch'),
      // eslint-disable-next-line @typescript-eslint/require-await
      download: async () => err('storage-not-found'),
      // eslint-disable-next-line @typescript-eslint/require-await
      exists: async () => ok(false),
      // eslint-disable-next-line @typescript-eslint/require-await
      signedUrl: async () => err('storage-unavailable'),
    };
    const { deps } = await setupWorld({ storage: corruptStorage });
    const r = await uploadDocument(deps)(baseCmd());
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'storage-integrity-mismatch');
  });
});

// Smoke: garante que DocumentId.generate foi importado (silence unused).
void DocumentId.generate;
