import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Competencia from '#src/modules/financial/domain/document/competencia.ts';
import * as Retention from '#src/modules/financial/domain/shared/retention.ts';
import * as SourceFileRef from '#src/modules/financial/domain/document/source-file-ref.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import { createMockDocumentReader } from '#src/modules/financial/adapters/document-reader/mock.ts';
import { createInMemorySourceFileStorage } from '#src/modules/financial/adapters/storage/source-file-storage.in-memory.ts';
import type { DocumentReaderResult } from '#src/modules/financial/domain/document-reader/types.ts';
// W0 RED: mapper e use case ainda não existem (value imports → ERR_MODULE_NOT_FOUND).
import { readerResultToDraft } from '#src/modules/financial/application/document-reader-to-draft.ts';
import { ingestDocument } from '#src/modules/financial/application/use-cases/ingest-document.ts';
import type {
  SourceFileStoragePort,
  SourceFileUploadInput,
} from '#src/modules/financial/application/ports/source-file-storage.ts';
import type {
  SaveDraftCommand,
  SaveDraftOutput,
  SaveDraftError,
} from '#src/modules/financial/application/use-cases/save-draft.ts';

const must = <T, E>(r: Result<T, E>): T => {
  if (!r.ok) throw new Error(`esperava ok, veio err: ${JSON.stringify(r.error)}`);
  return r.value;
};

const SEED: DocumentReaderResult = {
  resolvedVia: 'xml',
  type: 'NFS-e',
  documentNumber: '2024-0537',
  competence: must(Competencia.fromString('2026-04')),
  issueDate: new Date('2026-04-28T00:00:00.000Z'),
  supplier: { legalName: 'RAZAO SOCIAL LTDA', taxId: '12345678000199' },
  grossValue: must(Money.fromCents(100000)),
  retentions: [
    must(Retention.create({ type: 'ISS', baseCents: 100000, rateBps: 500, valueCents: 5000 })),
  ],
};

const STORED = must(
  SourceFileRef.create({
    bucket: 'fin-documents',
    key: 'financial/doc/nota.pdf',
    hashSha256: 'a'.repeat(64),
    sizeBytes: 2048,
    mimeType: 'application/pdf',
  }),
);

// Spy de storage: registra chamadas (upload/remove) e devolve um Result configurável.
const storageSpy = (behavior: Result<SourceFileRef.SourceFileRef, 'source-file-upload-failed'>) => {
  const calls: SourceFileUploadInput[] = [];
  const removeCalls: SourceFileRef.SourceFileRef[] = [];
  const port: SourceFileStoragePort = {
    upload: (input) => {
      calls.push(input);
      return Promise.resolve(behavior);
    },
    remove: (ref) => {
      removeCalls.push(ref);
      return Promise.resolve(ok(undefined));
    },
  };
  return { calls, removeCalls, port };
};

// Spy de saveDraft: captura o command e devolve ok(documentId).
const saveDraftSpy = () => {
  const commands: SaveDraftCommand[] = [];
  const fn = (cmd: SaveDraftCommand): Promise<Result<SaveDraftOutput, SaveDraftError>> => {
    commands.push(cmd);
    return Promise.resolve(ok({ documentId: cmd.id ?? DocumentId.generate() }));
  };
  return { commands, fn };
};

const INPUT = {
  bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  fileName: 'nota.pdf',
  mimeType: 'application/pdf',
  uploadedBy: '00000000-0000-4000-8000-000000000001',
};

describe('financial/application/document-reader-to-draft (mapper)', () => {
  it('CA4: mapeia DocumentReaderResult → rascunho (Money→cents, Competencia→string, retenções, supplier→description)', () => {
    const draft = readerResultToDraft(SEED);
    assert.equal(draft.type, 'NFS-e');
    assert.equal(draft.documentNumber, '2024-0537');
    assert.equal(draft.competencia, '2026-04');
    assert.equal(draft.grossValueCents, 100000);
    assert.deepEqual(draft.retentions, [
      { type: 'ISS', baseCents: 100000, rateBps: 500, valueCents: 5000 },
    ]);
    assert.match(String(draft.description), /RAZAO SOCIAL LTDA/);
    assert.match(String(draft.description), /12345678000199/);
    assert.equal('supplierRef' in draft, false); // humano seleciona
  });
});

describe('financial/application/use-cases/ingest-document', () => {
  it('CA1: sucesso → guarda o PDF + rascunho pré-preenchido + resolvedVia', async () => {
    const storage = storageSpy(ok(STORED));
    const save = saveDraftSpy();
    const ingest = ingestDocument({
      reader: createMockDocumentReader({ result: SEED }),
      storage: storage.port,
      saveDraft: save.fn,
      idGen: DocumentId.generate,
    });
    const r = await ingest(INPUT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.resolvedVia, 'xml');
    assert.equal(storage.calls.length, 1); // guardou o PDF
    assert.equal(save.commands.length, 1);
    assert.equal(save.commands[0]?.type, 'NFS-e'); // pré-preencheu
    assert.notEqual(save.commands[0]?.sourceFile, undefined); // vinculou o comprovante
  });

  it('CA2: erro de LEITURA (scanned) → guarda o PDF + rascunho vazio + resolvedVia null', async () => {
    const storage = storageSpy(ok(STORED));
    const save = saveDraftSpy();
    const ingest = ingestDocument({
      reader: createMockDocumentReader({ error: 'scanned-unsupported' }),
      storage: storage.port,
      saveDraft: save.fn,
      idGen: DocumentId.generate,
    });
    const r = await ingest(INPUT);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.resolvedVia, null);
    assert.equal(storage.calls.length, 1); // guardou mesmo sem ler
    assert.equal(save.commands[0]?.type, undefined); // rascunho vazio
    assert.notEqual(save.commands[0]?.sourceFile, undefined); // mas com o comprovante
  });

  it('CA3: erro de RECURSO (bomb) → err, NÃO guarda o PDF nem cria rascunho', async () => {
    const storage = storageSpy(ok(STORED));
    const save = saveDraftSpy();
    const ingest = ingestDocument({
      reader: createMockDocumentReader({ error: 'decompression-limit-exceeded' }),
      storage: storage.port,
      saveDraft: save.fn,
      idGen: DocumentId.generate,
    });
    const r = await ingest(INPUT);
    assert.equal(r.ok, false);
    assert.equal(storage.calls.length, 0); // NÃO guardou
    assert.equal(save.commands.length, 0); // NÃO criou rascunho
  });

  it('CA6: falha de upload → err (sem rascunho)', async () => {
    const storage = storageSpy(err('source-file-upload-failed'));
    const save = saveDraftSpy();
    const ingest = ingestDocument({
      reader: createMockDocumentReader({ result: SEED }),
      storage: storage.port,
      saveDraft: save.fn,
      idGen: DocumentId.generate,
    });
    const r = await ingest(INPUT);
    assert.equal(r.ok, false);
    assert.equal(save.commands.length, 0);
  });

  it('F1/F2: fileName com path-traversal → err e NÃO grava (validação antes do write)', async () => {
    const storage = createInMemorySourceFileStorage();
    const r = await storage.upload({
      documentId: DocumentId.generate(),
      bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]),
      mimeType: 'application/pdf',
      fileName: '../../evil',
    });
    assert.equal(r.ok, false); // key rejeitada antes do store.set
  });

  it('F4: saveDraft falha após upload → remove o comprovante órfão (best-effort)', async () => {
    const storage = storageSpy(ok(STORED));
    const failingSaveDraft = (): Promise<Result<SaveDraftOutput, SaveDraftError>> =>
      Promise.resolve(err('document-repository-failure'));
    const ingest = ingestDocument({
      reader: createMockDocumentReader({ result: SEED }),
      storage: storage.port,
      saveDraft: failingSaveDraft,
      idGen: DocumentId.generate,
    });
    const r = await ingest(INPUT);
    assert.equal(r.ok, false);
    assert.equal(storage.calls.length, 1); // guardou
    assert.equal(storage.removeCalls.length, 1); // e removeu o órfão
  });
});
