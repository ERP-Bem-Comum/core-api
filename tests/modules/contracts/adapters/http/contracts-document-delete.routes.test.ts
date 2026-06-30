/**
 * CTR-HTTP-DOCUMENT-DELETE — W0 (RED) — exclusão LÓGICA de documento via HTTP.
 *
 * DEVE FALHAR: a rota `DELETE /contracts/:id/documents/:documentId` não existe; o body Zod
 * `{ reason }` e o wiring de `deleteDocument` no composition ainda não foram feitos. GREEN quando o
 * W1 entregar o schema do body + o wiring + a rota.
 *
 * Princípio #14 / RN-11: exclusão é SEMPRE lógica — nunca apaga fisicamente. Após o DELETE, o
 * documento permanece visível no detalhe do contrato com `status: 'LogicallyDeleted'` (trilha de
 * auditoria preservada). Permissão `contract:write` (mesma das demais escritas de documento, D3).
 *
 * Mapeamento (SPEC C2 §3): 204 sucesso · 404 documento inexistente/já-excluído · 400 reason inválido
 * (Zod) · 401 sem token · 403 sem permissão.
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
const WRITER_EMAIL = 'writer@example.com'; // seed RBAC: contract:write
const PLAIN_EMAIL = 'plain@example.com'; // register normal: roles:[]
const USER_UUID = '44444444-4444-4444-8444-444444444444';

const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const DOC_TARGET_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // Active, alvo da exclusão
const MISSING_CONTRACT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MISSING_DOC_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

// Documento Active com id fixo (seed + asserts de exclusão lógica).
const buildDoc = (id: string, parentId: string) =>
  fromOk(
    Document.create({
      id: fromOk(DocumentId.rehydrate(id), 'docId'),
      parentType: 'Contract',
      parentId: fromOk(ContractId.rehydrate(parentId), 'parentId'),
      categoria: 'signed_contract',
      fileName: 'doc.pdf',
      mimeType: 'application/pdf',
      sizeBytes: PDF_BYTES.length,
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
    // `contract:read` além de `:write` para o helper `docStatusInDetail` ler o GET de detalhe
    // (a rota DELETE em si exige apenas `contract:write`).
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: ['contract:read', 'contract:write'] },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [buildContract({ id: ACTIVE_ID, sequentialNumber: '001/2026' })],
      documents: [buildDoc(DOC_TARGET_ID, ACTIVE_ID)],
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

const loginSeeded = async (app: App, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (app: App, email: string): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return loginSeeded(app, email);
};

const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });
const url = (c: string, d: string): string => `/api/v2/contracts/${c}/documents/${d}`;

/** Lê o status do documento no detalhe enriquecido do contrato (prova da trilha preservada). */
const docStatusInDetail = async (
  app: App,
  token: string,
  contractId: string,
  documentId: string,
): Promise<string | undefined> => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v2/contracts/${contractId}`,
    headers: bearer(token),
  });
  const body = res.json() as { documents: readonly { id: string; status: string }[] };
  return body.documents.find((d) => d.id === documentId)?.status;
};

// ─── AuthN/AuthZ ──────────────────────────────────────────────────────────────

describe('CTR-HTTP-DOCUMENT-DELETE — DELETE /contracts/:id/documents/:documentId — auth', () => {
  it('sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      payload: { reason: 'documento enviado por engano' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: 'documento enviado por engano' },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });
});

// ─── CA1/CA4: sucesso — 204 + exclusão LÓGICA (trilha preservada) ─────────────

describe('CTR-HTTP-DOCUMENT-DELETE — sucesso (204 + LogicallyDeleted)', () => {
  it('CA1: reason válido -> 204 sem corpo', async () => {
    // Arrange
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    // Act
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: 'documento enviado por engano' },
    });
    // Assert
    assert.equal(res.statusCode, 204);
    assert.equal(res.body, '');
    await teardown();
  });

  it('CA1/CA4: documento permanece no detalhe com status LogicallyDeleted (nunca apaga fisicamente)', async () => {
    // Arrange
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    assert.equal(await docStatusInDetail(app, token, ACTIVE_ID, DOC_TARGET_ID), 'Active');
    // Act
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: 'substituído por versão correta' },
    });
    // Assert
    assert.equal(res.statusCode, 204);
    assert.equal(await docStatusInDetail(app, token, ACTIVE_ID, DOC_TARGET_ID), 'LogicallyDeleted');
    await teardown();
  });
});

// ─── CA2: reason inválido -> 400 (Zod) ───────────────────────────────────────

describe('CTR-HTTP-DOCUMENT-DELETE — reason inválido (400)', () => {
  it('CA2: reason vazio -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: '' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: reason > 500 chars -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: 'x'.repeat(501) },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: reason ausente -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });
});

// ─── CA3: inexistente / já-excluído -> 404 ───────────────────────────────────

describe('CTR-HTTP-DOCUMENT-DELETE — inexistente / já-excluído (404)', () => {
  it('CA3: documento inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, MISSING_DOC_ID),
      headers: bearer(token),
      payload: { reason: 'motivo qualquer' },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA3: documento em contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'DELETE',
      url: url(MISSING_CONTRACT_ID, MISSING_DOC_ID),
      headers: bearer(token),
      payload: { reason: 'motivo qualquer' },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA3: segundo DELETE no mesmo documento (já-excluído) -> 404 (sem efeito)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const first = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: 'primeira exclusão' },
    });
    assert.equal(first.statusCode, 204);
    const second = await app.inject({
      method: 'DELETE',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { reason: 'segunda exclusão' },
    });
    assert.equal(second.statusCode, 404);
    await teardown();
  });
});

// ─── CA6: OpenAPI documenta a rota ───────────────────────────────────────────

describe('CTR-HTTP-DOCUMENT-DELETE — OpenAPI', () => {
  it('CA6: /docs/json contém DELETE /contracts/{id}/documents/{documentId}', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, { delete?: unknown }> };
    const path = '/api/v2/contracts/{id}/documents/{documentId}';
    assert.ok(
      Object.prototype.hasOwnProperty.call(doc.paths, path) &&
        doc.paths[path]?.delete !== undefined,
      'rota DELETE de documento ausente no OpenAPI',
    );
    await teardown();
  });
});
