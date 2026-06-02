/**
 * CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES — W0 (RED) — mapper agregado+filhos -> DTO de detalhe.
 *
 * DEVE FALHAR: `contractToDetailDto` ainda não existe em
 * `#src/modules/contracts/adapters/http/contract-dto.ts`, nem o tipo `ContractDetail`
 * (read-model) em `application/use-cases/get-contract-detail.ts`.
 *
 * GREEN quando W1 entregar o read-model + o mapper que:
 *   - reusa `contractToListItem` para o cabeçalho do contrato;
 *   - mapeia os 4 kinds de aditivo (Addition/Suppression/TermChange/Misc) -> JSON plano;
 *   - mapeia os 3 estados de documento (Active/Superseded/LogicallyDeleted) com `status`;
 *   - ordena `amendments[]` por `amendmentNumber` asc.
 *
 * Sem MySQL — fixtures de domínio puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { contractToDetailDto } from '#src/modules/contracts/adapters/http/contract-dto.ts';
import type { ContractDetail } from '#src/modules/contracts/application/use-cases/get-contract-detail.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as ContractDocument from '#src/modules/contracts/domain/document/document.ts';
import type {
  ActiveContractDocument,
  SupersededContractDocument,
  LogicallyDeletedContractDocument,
} from '#src/modules/contracts/domain/document/types.ts';

import { buildContract, buildAmendment } from '../persistence/fixtures.ts';

const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const docId = (v: string) => unwrap(DocumentId.rehydrate(v));
const ctrId = (v: string) => unwrap(ContractId.rehydrate(v));
const userRef = () => unwrap(UserRef.rehydrate('44444444-4444-4444-8444-444444444444'));

const buildActiveDoc = (
  over: Partial<{ id: string; fileName: string; uploadedAtISO: string }> = {},
): ActiveContractDocument =>
  unwrap(
    ContractDocument.create({
      id: docId(over.id ?? '33333333-3333-4333-8333-333333333333'),
      parentType: 'Contract',
      parentId: ctrId(CONTRACT_ID),
      categoria: 'signed_contract',
      fileName: over.fileName ?? 'contrato.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      hashSha256: 'a'.repeat(64),
      bucket: unwrap(createBucketName('contracts-documents')),
      storageKey: unwrap(createStorageKey('contracts/contrato.pdf')),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date(over.uploadedAtISO ?? '2026-03-01T00:00:00.000Z'),
      uploadedBy: userRef(),
      retentionUntil: null,
    }),
  ).document;

describe('contractToDetailDto — cabeçalho do contrato', () => {
  it('reusa o list-item do contrato (mesmos campos top-level) + adiciona amendments/documents', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [],
      documents: [],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.id, CONTRACT_ID);
    assert.equal(dto.status, 'Active');
    assert.deepEqual(dto.originalValue, { cents: 10_000_000 });
    assert.deepEqual(dto.amendments, []);
    assert.deepEqual(dto.documents, []);
  });
});

describe('contractToDetailDto — amendments[] (4 kinds + ordenação)', () => {
  it('mapeia Addition: impactValueCents presente', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [buildAmendment({ kind: 'Addition', impactValueCents: 500_000 })],
      documents: [],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.amendments.length, 1);
    const a = dto.amendments[0]!;
    assert.equal(a.kind, 'Addition');
    assert.equal((a as { impactValueCents: number }).impactValueCents, 500_000);
    assert.equal(a.status, 'Pending');
  });

  it('mapeia Suppression: impactValueCents presente', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [
        buildAmendment({
          id: '22222222-2222-4222-8222-222222222223',
          kind: 'Suppression',
          impactValueCents: 200_000,
        }),
      ],
      documents: [],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.amendments[0]!.kind, 'Suppression');
    assert.equal((dto.amendments[0] as { impactValueCents: number }).impactValueCents, 200_000);
  });

  it('mapeia TermChange: newEndDate ISO presente', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [
        buildAmendment({
          id: '22222222-2222-4222-8222-222222222224',
          kind: 'TermChange',
          newEndDateISO: '2027-12-31',
        }),
      ],
      documents: [],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.amendments[0]!.kind, 'TermChange');
    assert.equal((dto.amendments[0] as { newEndDate: string }).newEndDate, '2027-12-31');
  });

  it('mapeia Misc: sem impactValueCents nem newEndDate', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [buildAmendment({ id: '22222222-2222-4222-8222-222222222225', kind: 'Misc' })],
      documents: [],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.amendments[0]!.kind, 'Misc');
    assert.equal('impactValueCents' in dto.amendments[0]!, false);
    assert.equal('newEndDate' in dto.amendments[0]!, false);
  });

  it('ordena amendments por amendmentNumber asc', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [
        buildAmendment({
          id: '22222222-2222-4222-8222-222222222226',
          kind: 'Misc',
          amendmentNumber: 'AD 02-001/2026',
        }),
        buildAmendment({
          id: '22222222-2222-4222-8222-222222222227',
          kind: 'Misc',
          amendmentNumber: 'AD 01-001/2026',
        }),
      ],
      documents: [],
    };
    const dto = contractToDetailDto(detail);
    assert.deepEqual(
      dto.amendments.map((a) => a.amendmentNumber),
      ['AD 01-001/2026', 'AD 02-001/2026'],
    );
  });
});

describe('contractToDetailDto — documents[] (3 estados, campo status)', () => {
  it('mapeia documento Active com campos de arquivo + status', () => {
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [],
      documents: [buildActiveDoc({ fileName: 'contrato.pdf' })],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.documents.length, 1);
    const d = dto.documents[0]!;
    assert.equal(d.status, 'Active');
    assert.equal(d.fileName, 'contrato.pdf');
    assert.equal(d.mimeType, 'application/pdf');
    assert.equal(d.sizeBytes, 1024);
    assert.equal(d.version, 1);
    assert.equal(d.categoria, 'signed_contract');
    assert.equal(d.uploadedAt, '2026-03-01T00:00:00.000Z');
  });

  it('inclui documento Superseded (política: todos os estados, com status)', () => {
    const active = buildActiveDoc({ id: '33333333-3333-4333-8333-333333333334' });
    const superseded: SupersededContractDocument = unwrap(
      ContractDocument.supersede(
        active,
        docId('33333333-3333-4333-8333-333333333335'),
        userRef(),
        new Date('2026-04-01T00:00:00.000Z'),
      ),
    ).document;
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [],
      documents: [superseded],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.documents[0]!.status, 'Superseded');
  });

  it('inclui documento LogicallyDeleted (política: todos os estados, com status)', () => {
    const active = buildActiveDoc({ id: '33333333-3333-4333-8333-333333333336' });
    const deleted: LogicallyDeletedContractDocument = unwrap(
      ContractDocument.logicallyDelete(
        active,
        'erro de upload',
        userRef(),
        new Date('2026-04-02T00:00:00.000Z'),
      ),
    ).document;
    const detail: ContractDetail = {
      contract: buildContract({ id: CONTRACT_ID }),
      amendments: [],
      documents: [deleted],
    };
    const dto = contractToDetailDto(detail);
    assert.equal(dto.documents[0]!.status, 'LogicallyDeleted');
  });
});
