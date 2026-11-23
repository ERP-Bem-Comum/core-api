/**
 * Mensagem pública nas respostas de erro do plugin de contracts (CAS-105): nenhum 4xx mostra o
 * código interno em `message`, e nenhum 5xx mostra frase específica.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { err, ok } from '#src/shared/primitives/result.ts';
import { GENERIC_PUBLIC_MESSAGES } from '#src/shared/http/public-message.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as Document from '#src/modules/contracts/domain/document/document.ts';
import * as DocumentId from '#src/modules/contracts/domain/shared/document-id.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import {
  createBucketName,
  createStorageKey,
} from '#src/modules/contracts/application/ports/document-storage.types.ts';
import { CONTRACTS_PUBLIC_MESSAGES } from '#src/modules/contracts/adapters/http/error-messages.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';
import type { ContractsHttpDeps } from '#src/modules/contracts/adapters/http/composition.ts';
import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const USER_EMAIL = 'public.message@example.com';
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const DOCUMENT_ID = '33333333-3333-4333-8333-333333333333';

const makeApp = async (withDeps: (deps: ContractsHttpDeps) => ContractsHttpDeps) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: USER_EMAIL, password: STRONG, permissions: ['contract:read', 'contract:write'] },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: CONTRACT_ID, sequentialNumber: '001/2026' })] },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(withDeps(contractsDeps), {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: USER_EMAIL, password: STRONG },
  });
  const token = (login.json() as { accessToken: string }).accessToken;
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, token, teardown };
};

interface ErrorBody {
  readonly error: Readonly<{ code: string; message: string }>;
}

describe('contracts — 5xx nunca mostra frase específica', () => {
  it('502 storage-permission-denied: frase genérica interna, code inalterado', async () => {
    const { app, token, teardown } = await makeApp((d) => ({
      ...d,
      getDocumentContent: () => Promise.resolve(err('storage-permission-denied')),
    }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}/documents/${DOCUMENT_ID}/content`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 502, res.body);
    const body = res.json() as ErrorBody;
    assert.equal(body.error.code, 'storage-permission-denied');
    assert.equal(body.error.message, GENERIC_PUBLIC_MESSAGES.internal);
    await teardown();
  });

  it('503 contract-repo-unavailable por sendDomainError: frase genérica interna, code inalterado', async () => {
    const { app, token, teardown } = await makeApp((d) => ({
      ...d,
      cancelContract: () => Promise.resolve(err('contract-repo-unavailable')),
    }));
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 503, res.body);
    const body = res.json() as ErrorBody;
    assert.equal(body.error.code, 'contract-repo-unavailable');
    assert.equal(body.error.message, GENERIC_PUBLIC_MESSAGES.internal);
    await teardown();
  });
});

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};

const ownedDocument = () =>
  fromOk(
    Document.create({
      id: fromOk(DocumentId.rehydrate(DOCUMENT_ID)),
      parentType: 'Contract',
      parentId: fromOk(ContractId.rehydrate(CONTRACT_ID)),
      categoria: 'signed_contract',
      fileName: 'contrato.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 5,
      hashSha256: 'a'.repeat(64),
      bucket: fromOk(createBucketName('contracts-documents')),
      storageKey: fromOk(createStorageKey('contracts/2026/contrato.pdf')),
      signedElectronically: true,
      version: 1,
      uploadedAt: new Date('2026-03-01T00:00:00.000Z'),
      uploadedBy: fromOk(UserRef.rehydrate('44444444-4444-4444-8444-444444444444')),
      retentionUntil: null,
    }),
  ).document;

type SendResultCase = Readonly<{
  name: string;
  method: 'GET' | 'PATCH' | 'DELETE';
  url: string;
  payload?: Readonly<Record<string, unknown>>;
  withDeps: (deps: ContractsHttpDeps) => ContractsHttpDeps;
  status: number;
  code: string;
  message: string;
}>;

const NOT_FOUND = CONTRACTS_PUBLIC_MESSAGES['contract-not-found'];

const SEND_RESULT_CASES: readonly SendResultCase[] = [
  {
    name: 'GET /contracts (listContracts) 503',
    method: 'GET',
    url: '/api/v2/contracts',
    withDeps: (d) => ({
      ...d,
      listContracts: () => Promise.resolve(err('contract-repo-unavailable')),
    }),
    status: 503,
    code: 'internal',
    message: GENERIC_PUBLIC_MESSAGES.internal,
  },
  {
    name: 'GET /contracts/export.csv (listAllContracts) 503',
    method: 'GET',
    url: '/api/v2/contracts/export.csv',
    withDeps: (d) => ({
      ...d,
      listAllContracts: () => Promise.resolve(err('contract-repo-unavailable')),
    }),
    status: 503,
    code: 'internal',
    message: GENERIC_PUBLIC_MESSAGES.internal,
  },
  {
    name: 'GET /contracts/:id (getContractDetail) 404',
    method: 'GET',
    url: `/api/v2/contracts/${CONTRACT_ID}`,
    withDeps: (d) => ({
      ...d,
      getContractDetail: () => Promise.resolve(err('contract-not-found')),
    }),
    status: 404,
    code: 'contract-not-found',
    message: NOT_FOUND,
  },
  {
    name: 'PATCH /contracts/:id (updateContractMetadata) 404',
    method: 'PATCH',
    url: `/api/v2/contracts/${CONTRACT_ID}`,
    payload: { title: 'Título novo' },
    withDeps: (d) => ({
      ...d,
      updateContractMetadata: () => Promise.resolve(err('contract-not-found')),
    }),
    status: 404,
    code: 'contract-not-found',
    message: NOT_FOUND,
  },
  {
    name: 'PATCH /contracts/:id (getContractDetail depois do patch) 404',
    method: 'PATCH',
    url: `/api/v2/contracts/${CONTRACT_ID}`,
    payload: { title: 'Título novo' },
    withDeps: (d) => ({
      ...d,
      getContractDetail: () => Promise.resolve(err('contract-not-found')),
    }),
    status: 404,
    code: 'contract-not-found',
    message: NOT_FOUND,
  },
  {
    name: 'GET /contracts/:id/history (getContract) 404',
    method: 'GET',
    url: `/api/v2/contracts/${CONTRACT_ID}/history`,
    withDeps: (d) => ({
      ...d,
      getContract: () => Promise.resolve(err('contract-not-found')),
    }),
    status: 404,
    code: 'contract-not-found',
    message: NOT_FOUND,
  },
  {
    name: 'GET /contracts/:id/history (getContractTimeline) 503',
    method: 'GET',
    url: `/api/v2/contracts/${CONTRACT_ID}/history`,
    withDeps: (d) => ({
      ...d,
      getContractTimeline: () => Promise.resolve(err('timeline-repo-unavailable')),
    }),
    status: 503,
    code: 'internal',
    message: GENERIC_PUBLIC_MESSAGES.internal,
  },
  {
    name: 'DELETE /contracts/:id/documents/:documentId (deleteDocument) 404',
    method: 'DELETE',
    url: `/api/v2/contracts/${CONTRACT_ID}/documents/${DOCUMENT_ID}`,
    payload: { reason: 'Documento enviado por engano.' },
    withDeps: (d) => ({
      ...d,
      getDocument: () => Promise.resolve(ok(ownedDocument())),
      deleteDocument: () => Promise.resolve(err('document-already-deleted')),
    }),
    status: 404,
    code: 'document-already-deleted',
    message: CONTRACTS_PUBLIC_MESSAGES['document-already-deleted'],
  },
];

describe('contracts — respostas de erro via sendResult usam a tabela do módulo', () => {
  for (const c of SEND_RESULT_CASES) {
    it(`${c.name}: message PT-BR, nunca o código interno`, async () => {
      const { app, token, teardown } = await makeApp(c.withDeps);
      const res = await app.inject({
        method: c.method,
        url: c.url,
        headers: { authorization: `Bearer ${token}` },
        ...(c.payload !== undefined ? { payload: c.payload } : {}),
      });
      const body = res.json() as ErrorBody;
      assert.deepEqual(
        { status: res.statusCode, code: body.error.code, message: body.error.message },
        { status: c.status, code: c.code, message: c.message },
      );
      assert.notEqual(body.error.message, c.code);
      await teardown();
    });
  }
});
