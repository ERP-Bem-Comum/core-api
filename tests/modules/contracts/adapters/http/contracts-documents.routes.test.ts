/**
 * CONTRACTS-HTTP-DOCUMENTS (C3) — W0 (RED) — upload (raw octet-stream) + attach + supersede.
 *
 * DEVE FALHAR: as rotas `POST /contracts/:id/documents`, `.../amendments/:amendmentId/documents` e
 * `.../documents/:documentId/supersede` não existem; o composition não wira `DocumentStorage` nem os use
 * cases de documento; o `addContentTypeParser('application/octet-stream')` não está registrado. GREEN
 * quando o W1 entregar storage + use cases + as 3 rotas.
 *
 * Transporte (D1 da SPEC): raw `application/octet-stream`; metadados na query string; magic-bytes
 * validado contra o mimeType (PDF começa com `%PDF`). Permissão `contract:write` (D3).
 * CA5: o fluxo real (upload → activate / upload+attach → homologate) destrava o C2 SEM seed.
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

import {
  buildContract,
  buildPendingContract,
  buildPendingAmendmentWithoutDoc,
} from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com'; // seed RBAC: contract:write
const PLAIN_EMAIL = 'plain@example.com'; // register normal: roles:[]
const USER_UUID = '44444444-4444-4444-8444-444444444444';

const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const ACTIVE2_ID = '12121212-1212-4121-8121-121212121212';
const PENDING_ID = '99999999-9999-4999-8999-999999999999';
const AMEND_ID = '22222222-2222-4222-8222-222222222222'; // Pending sem doc, no ACTIVE_ID
const AMEND_OTHER_ID = '23232323-2323-4232-8232-232323232323'; // no ACTIVE2_ID (IDOR)
const DOC_TARGET_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'; // Active, p/ supersede
const DOC_REPLACEMENT_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'; // substituto
const MISSING_CONTRACT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MISSING_DOC_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n');
const NON_PDF_BYTES = Buffer.from('isto definitivamente nao e um PDF valido');

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

// Documento Active com id fixo (para seed + asserts de supersede).
const buildDoc = (
  id: string,
  parentId: string,
  categoria: 'signed_contract' | 'signed_amendment',
) =>
  fromOk(
    Document.create({
      id: fromOk(DocumentId.rehydrate(id), 'docId'),
      parentType: 'Contract',
      parentId: fromOk(ContractId.rehydrate(parentId), 'parentId'),
      categoria,
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
    seed: { users: [{ email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [
        buildContract({ id: ACTIVE_ID, sequentialNumber: '001/2026' }),
        buildContract({ id: ACTIVE2_ID, sequentialNumber: '002/2026' }),
        buildPendingContract({ id: PENDING_ID, sequentialNumber: '900/2026' }),
      ],
      amendments: [
        buildPendingAmendmentWithoutDoc({ id: AMEND_ID, contractId: ACTIVE_ID }),
        buildPendingAmendmentWithoutDoc({ id: AMEND_OTHER_ID, contractId: ACTIVE2_ID }),
      ],
      documents: [
        buildDoc(DOC_TARGET_ID, ACTIVE_ID, 'signed_contract'),
        buildDoc(DOC_REPLACEMENT_ID, ACTIVE_ID, 'signed_contract'),
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

const uploadUrl = (
  base: string,
  q: Readonly<{ categoria: string; fileName: string; mimeType: string }>,
): string =>
  `${base}?categoria=${q.categoria}&fileName=${encodeURIComponent(q.fileName)}` +
  // G2: signedAt exigido no upload+attach de aditivo; inofensivo (stripped) no de contrato.
  `&mimeType=${encodeURIComponent(q.mimeType)}&signedElectronically=true&signedAt=2026-02-15`;

const octet = (token: string): Record<string, string> => ({
  'content-type': 'application/octet-stream',
  authorization: `Bearer ${token}`,
});

// ─── E1: POST /contracts/:id/documents ───────────────────────────────────────

describe('CONTRACTS-HTTP-DOCUMENTS (C3) — POST /contracts/:id/documents', () => {
  const q = { categoria: 'signed_contract', fileName: 'contrato.pdf', mimeType: 'application/pdf' };

  it('CA1: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${ACTIVE_ID}/documents`, q),
      headers: { 'content-type': 'application/octet-stream' },
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${ACTIVE_ID}/documents`, q),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA2: octet-stream + query válidos + contrato existente -> 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${ACTIVE_ID}/documents`, q),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 201);
    const body = res.json() as { categoria: string };
    assert.equal(body.categoria, 'signed_contract');
    await teardown();
  });

  it('CA2: contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${MISSING_CONTRACT_ID}/documents`, q),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA2: mimeType fora da allowlist -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${ACTIVE_ID}/documents`, {
        ...q,
        mimeType: 'application/x-evil',
      }),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: fileName com separador de path -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${ACTIVE_ID}/documents`, {
        ...q,
        fileName: '../../etc/passwd',
      }),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: magic-bytes ≠ mimeType declarado -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${ACTIVE_ID}/documents`, q), // diz application/pdf
      headers: octet(token),
      payload: NON_PDF_BYTES, // mas os bytes não são PDF
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

// ─── E2: POST /contracts/:id/amendments/:amendmentId/documents (upload+attach) ─

describe('CONTRACTS-HTTP-DOCUMENTS (C3) — POST /:id/amendments/:amendmentId/documents', () => {
  const q = { categoria: 'signed_amendment', fileName: 'aditivo.pdf', mimeType: 'application/pdf' };
  const url = (c: string, a: string): string =>
    uploadUrl(`/api/v2/contracts/${c}/amendments/${a}/documents`, q);

  it('CA1: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, AMEND_ID),
      headers: { 'content-type': 'application/octet-stream' },
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, AMEND_ID),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA3: aditivo Pending sem doc -> 201 + aditivo com signedDocumentRef', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, AMEND_ID),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 201);
    await teardown();
  });

  it('CA3: aditivo inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, MISSING_DOC_ID),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA3: aditivo de outro contrato (IDOR) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    // AMEND_OTHER pertence a ACTIVE2; path usa ACTIVE_ID -> ownership mismatch.
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, AMEND_OTHER_ID),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });
});

// ─── E3: POST /contracts/:id/documents/:documentId/supersede ──────────────────

describe('CONTRACTS-HTTP-DOCUMENTS (C3) — POST /:id/documents/:documentId/supersede', () => {
  const url = (c: string, d: string): string => `/api/v2/contracts/${c}/documents/${d}/supersede`;
  const bearer = (t: string): Record<string, string> => ({ authorization: `Bearer ${t}` });

  it('CA1: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      payload: { supersededByDocumentId: DOC_REPLACEMENT_ID },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { supersededByDocumentId: DOC_REPLACEMENT_ID },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA4: doc Active + substituto existente -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { supersededByDocumentId: DOC_REPLACEMENT_ID },
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA4: documento inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, MISSING_DOC_ID),
      headers: bearer(token),
      payload: { supersededByDocumentId: DOC_REPLACEMENT_ID },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA4: substituto inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(ACTIVE_ID, DOC_TARGET_ID),
      headers: bearer(token),
      payload: { supersededByDocumentId: MISSING_DOC_ID },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});

// ─── CA5: fluxo real destrava activate/homologate (C2) SEM seed ───────────────

describe('CONTRACTS-HTTP-DOCUMENTS (C3) — CA5 fluxo real (sem seed)', () => {
  const makeBareApp = async () => {
    const authDeps = await buildAuthHttpDeps({
      driver: 'memory',
      seed: { users: [{ email: WRITER_EMAIL, password: STRONG, permissions: ['contract:write'] }] },
    });
    // SEM seed de contratos/documentos: tudo nasce via HTTP.
    const contractsDeps = await buildContractsHttpDeps({ driver: 'memory' });
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

  it('CA5: Pending (POST) -> upload signed_contract (E1) -> activate (C2) 200', async () => {
    const { app, teardown } = await makeBareApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const auth = { authorization: `Bearer ${token}` };

    const created = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: auth,
      payload: {
        mode: 'Pending',
        title: 'Contrato',
        objective: 'Obj',
        originalValueCents: 10_000_000,
        periodStart: '2026-02-01',
        periodEnd: '2026-12-31',
        contractor: { type: 'supplier', id: '55555555-5555-4555-8555-555555555555' },
      },
    });
    assert.equal(created.statusCode, 201);
    const id = (created.json() as { id: string }).id;

    const up = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${id}/documents`, {
        categoria: 'signed_contract',
        fileName: 'c.pdf',
        mimeType: 'application/pdf',
      }),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(up.statusCode, 201);

    const activated = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${id}/activate`,
      headers: auth,
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(activated.statusCode, 200);
    assert.equal((activated.json() as { status: string }).status, 'Active');
    await teardown();
  });

  it('CA5: Active -> amendment -> E2 upload+attach -> homologate (C2) 200', async () => {
    const { app, teardown } = await makeBareApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const auth = { authorization: `Bearer ${token}` };

    const created = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: auth,
      payload: {
        mode: 'Active',
        title: 'Contrato',
        objective: 'Obj',
        signedAt: '2026-01-15',
        originalValueCents: 10_000_000,
        periodStart: '2026-02-01',
        periodEnd: '2026-12-31',
        contractor: { type: 'supplier', id: '55555555-5555-4555-8555-555555555555' },
      },
    });
    assert.equal(created.statusCode, 201);
    const contractId = (created.json() as { id: string }).id;

    const amend = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${contractId}/amendments`,
      headers: auth,
      payload: {
        kind: 'Addition',
        amendmentNumber: 'AD 01-701/2026',
        description: 'Acréscimo',
        impactValueCents: 500_000,
      },
    });
    assert.equal(amend.statusCode, 201);
    const amendmentId = (amend.json() as { id: string }).id;

    const up = await app.inject({
      method: 'POST',
      url: uploadUrl(`/api/v2/contracts/${contractId}/amendments/${amendmentId}/documents`, {
        categoria: 'signed_amendment',
        fileName: 'a.pdf',
        mimeType: 'application/pdf',
      }),
      headers: octet(token),
      payload: PDF_BYTES,
    });
    assert.equal(up.statusCode, 201);

    const homologated = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${contractId}/amendments/${amendmentId}/homologate`,
      headers: auth,
      payload: { homologatedBy: USER_UUID },
    });
    assert.equal(homologated.statusCode, 200);
    assert.equal((homologated.json() as { status: string }).status, 'Active');
    await teardown();
  });
});

// ─── CA6/CA8: OpenAPI + bodyLimit cirúrgico ───────────────────────────────────

describe('CONTRACTS-HTTP-DOCUMENTS (C3) — OpenAPI + bodyLimit', () => {
  it('CA6: /docs/json contém as 3 rotas de documento', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, { post?: unknown }> };
    const hasPost = (p: string): boolean =>
      Object.prototype.hasOwnProperty.call(doc.paths, p) && doc.paths[p]?.post !== undefined;
    assert.ok(hasPost('/api/v2/contracts/{id}/documents'), 'E1');
    assert.ok(hasPost('/api/v2/contracts/{id}/amendments/{amendmentId}/documents'), 'E2');
    assert.ok(hasPost('/api/v2/contracts/{id}/documents/{documentId}/supersede'), 'E3');
    await teardown();
  });

  it('CA8: rota não-upload (POST /contracts) rejeita corpo > 1 MiB (limite global intacto)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const huge = 'x'.repeat(1_200_000);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        mode: 'Active',
        title: huge,
        objective: 'Obj',
        signedAt: '2026-01-15',
        originalValueCents: 10_000_000,
        periodStart: '2026-02-01',
        periodEnd: '2026-12-31',
        contractor: { type: 'supplier', id: '55555555-5555-4555-8555-555555555555' },
      },
    });
    assert.equal(res.statusCode, 413);
    await teardown();
  });
});
