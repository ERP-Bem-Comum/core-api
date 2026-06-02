/**
 * CTR-HTTP-CONTRACT-DETAIL-CHILDREN-FILES — W0 (RED) — GET /contracts/:id enriquecido.
 *
 * DEVE FALHAR: a rota GET /contracts/:id ainda devolve só o list-item (sem
 * `amendments[]`/`documents[]`); `buildContractsHttpDeps` ainda não expõe
 * `getContractDetail`; o `contractDetailSchema` ainda é o list-item puro.
 *
 * GREEN quando W1 entregar: use case `getContractDetail` (compõe Contract +
 * Amendment[] + ContractDocument[]), `contractToDetailDto`, `contractDetailSchema`
 * com `amendments`/`documents`, e a rota ligada.
 *
 * Driver memory (sem Docker). Seed de contrato + 2 aditivos + 2 documentos.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import * as ContractDocument from '#src/modules/contracts/domain/document/document.ts';
import type { ActiveContractDocument } from '#src/modules/contracts/domain/document/types.ts';

import { buildContract, buildAmendment } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'reader@example.com';
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const MISSING_ID = '22222222-2222-4222-8222-222222222299';

const unwrap = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture broken: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildContractDoc = (
  id: string,
  fileName: string,
  uploadedAtISO: string,
): ActiveContractDocument =>
  unwrap(
    ContractDocument.create({
      id: unwrap(DocumentId.rehydrate(id)),
      parentType: 'Contract',
      parentId: unwrap(ContractId.rehydrate(CONTRACT_ID)),
      categoria: 'signed_contract',
      fileName,
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      hashSha256: 'b'.repeat(64),
      bucket: unwrap(createBucketName('contracts-documents')),
      storageKey: unwrap(createStorageKey(`contracts/${fileName}`)),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date(uploadedAtISO),
      uploadedBy: unwrap(UserRef.rehydrate('44444444-4444-4444-8444-444444444444')),
      retentionUntil: null,
    }),
  ).document;

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [buildContract({ id: CONTRACT_ID })],
      amendments: [
        buildAmendment({
          id: '22222222-2222-4222-8222-222222222201',
          contractId: CONTRACT_ID,
          kind: 'Addition',
          amendmentNumber: 'AD 02-001/2026',
          impactValueCents: 500_000,
        }),
        buildAmendment({
          id: '22222222-2222-4222-8222-222222222202',
          contractId: CONTRACT_ID,
          kind: 'TermChange',
          amendmentNumber: 'AD 01-001/2026',
          newEndDateISO: '2027-12-31',
        }),
      ],
      documents: [
        buildContractDoc(
          '33333333-3333-4333-8333-333333333301',
          'a.pdf',
          '2026-03-01T00:00:00.000Z',
        ),
        buildContractDoc(
          '33333333-3333-4333-8333-333333333302',
          'b.pdf',
          '2026-03-02T00:00:00.000Z',
        ),
      ],
    },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: READER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

describe('GET /contracts/:id — detalhe enriquecido (amendments + documents)', () => {
  it('CA1+CA2: 200 com amendments[] (2) e documents[] (2) populados', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      id: string;
      status: string;
      amendments: { amendmentNumber: string; kind: string }[];
      documents: { fileName: string; status: string }[];
    };
    assert.equal(body.id, CONTRACT_ID);
    assert.equal(body.status, 'Active');
    assert.equal(body.amendments.length, 2);
    assert.equal(body.documents.length, 2);
    await teardown();
  });

  it('CA1: amendments[] ordenados por amendmentNumber asc', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: bearer(token),
    });
    const body = res.json() as { amendments: { amendmentNumber: string }[] };
    assert.deepEqual(
      body.amendments.map((a) => a.amendmentNumber),
      ['AD 01-001/2026', 'AD 02-001/2026'],
    );
    await teardown();
  });

  it('CA2: documents[] expõem fileName/mimeType/sizeBytes/version/status/uploadedAt', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: bearer(token),
    });
    const body = res.json() as {
      documents: {
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        version: number;
        status: string;
        uploadedAt: string;
      }[];
    };
    const fileNames = body.documents.map((d) => d.fileName).sort();
    assert.deepEqual(fileNames, ['a.pdf', 'b.pdf']);
    const first = body.documents[0]!;
    assert.equal(first.mimeType, 'application/pdf');
    assert.equal(first.sizeBytes, 2048);
    assert.equal(first.version, 1);
    assert.equal(first.status, 'Active');
    assert.ok(first.uploadedAt.startsWith('2026-03-0'));
    await teardown();
  });

  it('CA1: contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${MISSING_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});

describe('GET /contracts — list-item permanece enxuto (não-regressão, CA5)', () => {
  it('CA5: itens da lista NÃO carregam amendments/documents', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const items = res.json() as Record<string, unknown>[];
    assert.ok(items.length >= 1);
    for (const item of items) {
      assert.equal('amendments' in item, false);
      assert.equal('documents' in item, false);
    }
    await teardown();
  });
});
