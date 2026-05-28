/**
 * CONTRACTS-HTTP-DOCS-HARDENING — W0 (RED) — ownership do E3 + OpenAPI binário.
 *
 * Follow-ups 🟡 do C3 (REVIEW W2). DEVE FALHAR: (1) o supersede (E3) ainda não valida que o
 * `:documentId` pertence ao contrato `:id` → doc de outro contrato é aceito (200) em vez de 409;
 * (2) as rotas de upload (E1/E2) não documentam `requestBody` octet-stream/binary no `/docs/json`.
 * GREEN quando o W1 entregar o ownership check (getDocument reader) e o requestBody binário.
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

import * as Document from '#src/modules/contracts/domain/document/document.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';

import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com';
const USER_UUID = '44444444-4444-4444-8444-444444444444';

const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const ACTIVE2_ID = '12121212-1212-4121-8121-121212121212';
const DOC_OWN_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // pertence a ACTIVE_ID
const DOC_FOREIGN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'; // pertence a ACTIVE2_ID
const DOC_REPLACEMENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'; // substituto, ACTIVE_ID

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

const buildDoc = (id: string, parentId: string) =>
  fromOk(
    Document.create({
      id: fromOk(DocumentId.rehydrate(id), 'docId'),
      parentType: 'Contract',
      parentId: fromOk(ContractId.rehydrate(parentId), 'parentId'),
      categoria: 'signed_contract',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 8,
      hashSha256: 'a'.repeat(64),
      bucket: fromOk(createBucketName('contracts-documents'), 'bucket'),
      storageKey: fromOk(createStorageKey(`contracts/${id}/doc.pdf`), 'key'),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
      uploadedBy: fromOk(UserRef.rehydrate(USER_UUID), 'userRef'),
      retentionUntil: null,
    }),
    'document',
  ).document;

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [
        buildContract({ id: ACTIVE_ID, sequentialNumber: '001/2026' }),
        buildContract({ id: ACTIVE2_ID, sequentialNumber: '002/2026' }),
      ],
      documents: [
        buildDoc(DOC_OWN_ID, ACTIVE_ID),
        buildDoc(DOC_FOREIGN_ID, ACTIVE2_ID),
        buildDoc(DOC_REPLACEMENT_ID, ACTIVE_ID),
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

type App = Awaited<ReturnType<typeof buildApp>>;

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const supersedeUrl = (contractId: string, documentId: string): string =>
  `/api/v2/contracts/${contractId}/documents/${documentId}/supersede`;

describe('CONTRACTS-HTTP-DOCS-HARDENING — ownership do E3 (supersede)', () => {
  it('CA1: doc pertence ao contrato do path -> 200 (regressão)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: supersedeUrl(ACTIVE_ID, DOC_OWN_ID),
      headers: { authorization: `Bearer ${token}` },
      payload: { supersededByDocumentId: DOC_REPLACEMENT_ID },
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA1: doc de OUTRO contrato (path não confere) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    // DOC_FOREIGN pertence a ACTIVE2; path usa ACTIVE_ID -> ownership mismatch.
    const res = await app.inject({
      method: 'POST',
      url: supersedeUrl(ACTIVE_ID, DOC_FOREIGN_ID),
      headers: { authorization: `Bearer ${token}` },
      payload: { supersededByDocumentId: DOC_REPLACEMENT_ID },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });
});

describe('CONTRACTS-HTTP-DOCS-HARDENING — OpenAPI do corpo binário (E1/E2)', () => {
  it('CA2: /docs/json documenta requestBody octet-stream + format binary nas rotas de upload', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as {
      paths: Record<
        string,
        {
          post?: {
            requestBody?: {
              content?: Record<string, { schema?: { format?: string; type?: string } }>;
            };
          };
        }
      >;
    };

    for (const path of [
      '/api/v2/contracts/{id}/documents',
      '/api/v2/contracts/{id}/amendments/{amendmentId}/documents',
    ]) {
      const octet = doc.paths[path]?.post?.requestBody?.content?.['application/octet-stream'];
      assert.ok(octet !== undefined, `${path} deve ter requestBody application/octet-stream`);
      assert.equal(octet?.schema?.format, 'binary', `${path} schema deve ser format: binary`);
    }
    await teardown();
  });
});
