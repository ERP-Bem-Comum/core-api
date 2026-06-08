/**
 * CTR-HTTP-DOCUMENT-CONTENT — W0/W1 — conteúdo (bytes) do documento via HTTP.
 *
 * Rota: `GET /contracts/:id/documents/:documentId/content` → stream `application/pdf` +
 * `Content-Disposition: attachment; filename="..."`. Auth `contract:read`. Ownership:
 * o documento deve pertencer ao contrato `:id` — diretamente (parentType Contract) ou
 * via aditivo daquele contrato (parentType Amendment).
 *
 * Estratégia de fixture: faz upload real (octet-stream) antes do GET para que os bytes
 * existam tanto no repo de documentos quanto no storage in-memory (consistência
 * repo↔storage). Espelha o `00-setup-upload-doc.bru` dos e2e.
 *
 * Mapeamento (espelha DELETE): 200 sucesso · 404 inexistente/ownership · 403 sem
 * `contract:read` · 401 sem token.
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

import { buildContract, buildPendingAmendmentWithoutDoc } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const OPERATOR_EMAIL = 'operator@example.com'; // contract:read + contract:write
const READER_EMAIL = 'reader@example.com'; // contract:read apenas
const BARE_EMAIL = 'bare@example.com'; // sem permissões

const CONTRACT_A = '11111111-1111-4111-8111-111111111111';
const CONTRACT_B = '22222222-2222-4222-8222-222222222222';
const AMEND_A = '33333333-3333-4333-8333-333333333333';

// PDF mínimo válido (magic-bytes %PDF exigidos pelo upload).
const PDF_BYTES = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n');

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: OPERATOR_EMAIL,
          password: STRONG,
          permissions: ['contract:read', 'contract:write'],
        },
        { email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] },
      ],
    },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: {
      contracts: [
        buildContract({ id: CONTRACT_A, sequentialNumber: '001/2026' }),
        buildContract({ id: CONTRACT_B, sequentialNumber: '002/2026' }),
      ],
      amendments: [buildPendingAmendmentWithoutDoc({ id: AMEND_A, contractId: CONTRACT_A })],
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

const uploadQuery = (fileName: string): string =>
  `?categoria=signed_contract&fileName=${encodeURIComponent(fileName)}` +
  `&mimeType=${encodeURIComponent('application/pdf')}&signedElectronically=true`;

/** Faz upload de um documento ao contrato e devolve o `documentId` criado. */
const uploadContractDoc = async (
  app: App,
  token: string,
  contractId: string,
  fileName: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/contracts/${contractId}/documents${uploadQuery(fileName)}`,
    headers: { 'content-type': 'application/octet-stream', ...bearer(token) },
    payload: PDF_BYTES,
  });
  assert.equal(res.statusCode, 201, `upload contrato falhou: ${res.body}`);
  return (res.json() as { id: string }).id;
};

/** Faz upload de um documento ao aditivo e devolve o `documentId` criado. */
const uploadAmendmentDoc = async (
  app: App,
  token: string,
  contractId: string,
  amendmentId: string,
  fileName: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/contracts/${contractId}/amendments/${amendmentId}/documents${uploadQuery(fileName)}`,
    headers: { 'content-type': 'application/octet-stream', ...bearer(token) },
    payload: PDF_BYTES,
  });
  assert.equal(res.statusCode, 201, `upload aditivo falhou: ${res.body}`);
  return (res.json() as { id: string }).id;
};

const contentUrl = (contractId: string, documentId: string): string =>
  `/api/v2/contracts/${contractId}/documents/${documentId}/content`;

// ─── DOC-1 / DOC-2: sucesso — 200 application/pdf + content-disposition ───────

describe('CTR-HTTP-DOCUMENT-CONTENT — sucesso (200 + headers)', () => {
  it('DOC-1: documento de contrato -> 200 application/pdf com os bytes', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadContractDoc(app, token, CONTRACT_A, 'contrato.pdf');

    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, documentId),
      headers: bearer(token),
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /application\/pdf/);
    assert.deepEqual(res.rawPayload, PDF_BYTES);
    await teardown();
  });

  it('DOC-2: content-disposition com o nome original do arquivo', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadContractDoc(app, token, CONTRACT_A, 'contrato-assinado.pdf');

    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, documentId),
      headers: bearer(token),
    });

    assert.equal(res.statusCode, 200);
    const cd = res.headers['content-disposition'] ?? '';
    assert.equal(typeof cd, 'string');
    assert.match(cd, /attachment/);
    assert.match(cd, /contrato-assinado\.pdf/);
    await teardown();
  });
});

// ─── DOC-3: documento de aditivo acessível ───────────────────────────────────

describe('CTR-HTTP-DOCUMENT-CONTENT — documento de aditivo', () => {
  it('DOC-3: conteúdo do documento de um aditivo do contrato -> 200 PDF', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadAmendmentDoc(app, token, CONTRACT_A, AMEND_A, 'aditivo.pdf');

    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, documentId),
      headers: bearer(token),
    });

    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'] ?? '', /application\/pdf/);
    await teardown();
  });
});

// ─── DOC-4: ownership — documento de outro contrato -> 404 ────────────────────

describe('CTR-HTTP-DOCUMENT-CONTENT — ownership (404)', () => {
  it('DOC-4: documento do contrato A acessado via contrato B -> 404 (sem vazar bytes)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadContractDoc(app, token, CONTRACT_A, 'contrato.pdf');

    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_B, documentId), // contrato alheio
      headers: bearer(token),
    });

    assert.equal(res.statusCode, 404);
    assert.notDeepEqual(res.rawPayload, PDF_BYTES);
    await teardown();
  });

  it('DOC-4b: documento de aditivo do contrato A acessado via contrato B -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadAmendmentDoc(app, token, CONTRACT_A, AMEND_A, 'aditivo.pdf');

    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_B, documentId),
      headers: bearer(token),
    });

    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('documento inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, OPERATOR_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});

// ─── DOC-5: exige contract:read -> 403 ───────────────────────────────────────

describe('CTR-HTTP-DOCUMENT-CONTENT — authz (403)', () => {
  it('DOC-5: token sem contract:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const operatorToken = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadContractDoc(app, operatorToken, CONTRACT_A, 'contrato.pdf');

    const bareToken = await registerAndLogin(app, BARE_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, documentId),
      headers: bearer(bareToken),
    });

    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('reader (contract:read) consegue ler o conteúdo -> 200', async () => {
    const { app, teardown } = await makeApp();
    const operatorToken = await loginSeeded(app, OPERATOR_EMAIL);
    const documentId = await uploadContractDoc(app, operatorToken, CONTRACT_A, 'contrato.pdf');

    const readerToken = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, documentId),
      headers: bearer(readerToken),
    });

    assert.equal(res.statusCode, 200);
    await teardown();
  });
});

// ─── DOC-6: sem sessão -> 401 ────────────────────────────────────────────────

describe('CTR-HTTP-DOCUMENT-CONTENT — auth (401)', () => {
  it('DOC-6: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: contentUrl(CONTRACT_A, '99999999-9999-4999-8999-999999999999'),
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});
