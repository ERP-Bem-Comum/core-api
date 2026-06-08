/**
 * CONTRACTS-HTTP-WRITES-CORE (C2) — W0 (RED) — mutações core com RBAC.
 *
 * DEVE FALHAR: as rotas `POST /contracts`, `POST /contracts/:id/activate`,
 * `POST /contracts/:id/amendments` e `POST /contracts/:id/amendments/:amendmentId/homologate`
 * ainda não existem; o `buildContractsHttpDeps` ainda não aceita o `seed` estendido
 * `{ contracts, amendments, documents }` (D2) nem expõe os use cases de escrita. GREEN quando
 * o W1 entregar o seed objeto, os repos do writer, os 5 use cases e as 4 rotas.
 *
 * Driver memory (sem Docker). Token COM `contract:write` vem do seed RBAC; token SEM permissão
 * vem do register normal (roles:[]). Os caminhos 200 de activate/homologate dependem de documento
 * (upload é C3), então o pré-requisito é montado via seed estendido (D3).
 *
 * Mapeamento erro→HTTP (SPEC §3): 400 Zod · 404 not-found · 409 conflito de estado/transição/
 * unicidade · 422 invariante semântica · 201 create · 200 activate/homologate.
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
  buildPendingAmendmentWithDoc,
} from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'writer@example.com'; // seed RBAC: tem 'contract:write'
const PLAIN_EMAIL = 'plain@example.com'; // register normal: roles:[] (sem permissão)
const HOMOLOGATED_BY = '44444444-4444-4444-8444-444444444444';

// IDs do seed (UUIDs v4 válidos)
const ACTIVE_ID = '11111111-1111-4111-8111-111111111111';
const ACTIVE2_ID = '12121212-1212-4121-8121-121212121212';
const PENDING_WITHDOC_ID = '99999999-9999-4999-8999-999999999999';
const PENDING_NODOC_ID = '98989898-9898-4989-8989-898989898989';
const AMEND_HOMOLOG_ID = '22222222-2222-4222-8222-222222222222';
const AMEND_MISMATCH_ID = '23232323-2323-4232-8232-232323232323';
const MISSING_CONTRACT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MISSING_AMEND_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

const fromOk = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }, label: string): T => {
  if (!r.ok) throw new Error(`fixture ${label}: ${JSON.stringify(r.error)}`);
  return r.value;
};

// Documento `signed_contract` Active vinculado a um contrato (espelha activate-contract.test.ts).
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
      uploadedBy: fromOk(UserRef.rehydrate(HOMOLOGATED_BY), 'userRef'),
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
        buildPendingContract({ id: PENDING_WITHDOC_ID, sequentialNumber: '900/2026' }),
        buildPendingContract({ id: PENDING_NODOC_ID, sequentialNumber: '901/2026' }),
      ],
      amendments: [
        buildPendingAmendmentWithDoc({ id: AMEND_HOMOLOG_ID, contractId: ACTIVE_ID }),
        buildPendingAmendmentWithDoc({ id: AMEND_MISMATCH_ID, contractId: ACTIVE2_ID }),
      ],
      documents: [signedContractDoc(PENDING_WITHDOC_ID)],
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

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

const CONTRACTOR_BODY = {
  type: 'supplier',
  id: '55555555-5555-4555-8555-555555555555',
};

const activeBody = (overrides: Record<string, unknown> = {}) => ({
  mode: 'Active',
  sequentialNumber: '500/2026',
  title: 'Novo contrato',
  objective: 'Objetivo',
  signedAt: '2026-01-15',
  originalValueCents: 10_000_000,
  periodStart: '2026-02-01',
  periodEnd: '2026-12-31',
  contractor: CONTRACTOR_BODY,
  ...overrides,
});

const pendingBody = (overrides: Record<string, unknown> = {}) => ({
  mode: 'Pending',
  sequentialNumber: '501/2026',
  title: 'Contrato pendente',
  objective: 'Objetivo',
  originalValueCents: 10_000_000,
  periodStart: '2026-02-01',
  periodEnd: '2026-12-31',
  contractor: CONTRACTOR_BODY,
  ...overrides,
});

// ─── E1: POST /contracts ─────────────────────────────────────────────────────

describe('CONTRACTS-HTTP-WRITES-CORE (C2) — POST /contracts', () => {
  it('CA1: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      payload: activeBody(),
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody(),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA2: body Active válido -> 201 + status Active', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody(),
    });
    assert.equal(res.statusCode, 201);
    assert.equal((res.json() as { status: string }).status, 'Active');
    // HTTP-LOCATION-HEADER-201: 201 traz Location apontando para o recurso criado.
    const id = (res.json() as { id: string }).id;
    assert.equal(res.headers.location, `/api/v2/contracts/${id}`);
    await teardown();
  });

  it('CA2: body Pending válido -> 201 + status Pending', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: pendingBody(),
    });
    assert.equal(res.statusCode, 201);
    assert.equal((res.json() as { status: string }).status, 'Pending');
    // HTTP-LOCATION-HEADER-201: 201 traz Location apontando para o recurso criado.
    const id = (res.json() as { id: string }).id;
    assert.equal(res.headers.location, `/api/v2/contracts/${id}`);
    await teardown();
  });

  it('CA2: body inválido (sem title) -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody({ title: undefined }),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: body sem contractor -> 400 (Zod) — contratado obrigatório (FR-001)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody({ contractor: undefined }),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: contractor.id não-UUID -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody({ contractor: { type: 'supplier', id: 'not-a-uuid' } }),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA2: sequentialNumber duplicado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody({ sequentialNumber: '001/2026' }), // já existe no seed
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('CA2: período inválido (end < start) -> 422 (invariante de domínio, passa no Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/contracts',
      headers: bearer(token),
      payload: activeBody({ periodStart: '2026-12-31', periodEnd: '2026-01-01' }),
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

// ─── E2: POST /contracts/:id/activate ────────────────────────────────────────

describe('CONTRACTS-HTTP-WRITES-CORE (C2) — POST /contracts/:id/activate', () => {
  it('CA1: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${PENDING_WITHDOC_ID}/activate`,
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${PENDING_WITHDOC_ID}/activate`,
      headers: bearer(token),
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA3: Pending + doc signed_contract seedado -> 200 Active', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${PENDING_WITHDOC_ID}/activate`,
      headers: bearer(token),
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'Active');
    await teardown();
  });

  it('CA3: contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${MISSING_CONTRACT_ID}/activate`,
      headers: bearer(token),
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA3: contrato não-Pending (já Active) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${ACTIVE_ID}/activate`,
      headers: bearer(token),
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('CA3: Pending sem doc assinado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${PENDING_NODOC_ID}/activate`,
      headers: bearer(token),
      payload: { signedAt: '2026-02-01' },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('CA3: signedAt inválido -> 422 (domínio valida data; Zod aceita string)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${PENDING_WITHDOC_ID}/activate`,
      headers: bearer(token),
      payload: { signedAt: 'not-a-date' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

// ─── E3: POST /contracts/:id/amendments ──────────────────────────────────────

describe('CONTRACTS-HTTP-WRITES-CORE (C2) — POST /contracts/:id/amendments', () => {
  const additionBody = (overrides: Record<string, unknown> = {}) => ({
    kind: 'Addition',
    amendmentNumber: 'AD 02-001/2026',
    description: 'Acréscimo de valor',
    impactValueCents: 500_000,
    ...overrides,
  });

  it('CA1: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${ACTIVE_ID}/amendments`,
      payload: additionBody(),
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${ACTIVE_ID}/amendments`,
      headers: bearer(token),
      payload: additionBody(),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA4: contrato Active + body válido -> 201 aditivo Pending', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${ACTIVE_ID}/amendments`,
      headers: bearer(token),
      payload: additionBody(),
    });
    assert.equal(res.statusCode, 201);
    await teardown();
  });

  it('CA4: contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${MISSING_CONTRACT_ID}/amendments`,
      headers: bearer(token),
      payload: additionBody(),
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA4: contrato não-Active (Pending) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${PENDING_NODOC_ID}/amendments`,
      headers: bearer(token),
      payload: additionBody(),
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('CA4: Suppression excede valor vigente -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${ACTIVE_ID}/amendments`,
      headers: bearer(token),
      payload: additionBody({ kind: 'Suppression', impactValueCents: 99_999_999 }),
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA4: body inválido (kind desconhecido) -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/contracts/${ACTIVE_ID}/amendments`,
      headers: bearer(token),
      payload: { kind: 'Bogus', amendmentNumber: 'x', description: 'y' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });
});

// ─── E4: POST /contracts/:id/amendments/:amendmentId/homologate ──────────────

describe('CONTRACTS-HTTP-WRITES-CORE (C2) — POST /:id/amendments/:amendmentId/homologate', () => {
  const homologateUrl = (contractId: string, amendmentId: string): string =>
    `/api/v2/contracts/${contractId}/amendments/${amendmentId}/homologate`;

  it('CA1: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: homologateUrl(ACTIVE_ID, AMEND_HOMOLOG_ID),
      payload: { homologatedBy: HOMOLOGATED_BY },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem contract:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: homologateUrl(ACTIVE_ID, AMEND_HOMOLOG_ID),
      headers: bearer(token),
      payload: { homologatedBy: HOMOLOGATED_BY },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA5: aditivo PendingWithDocument + contrato Active -> 200 contrato recalculado', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: homologateUrl(ACTIVE_ID, AMEND_HOMOLOG_ID),
      headers: bearer(token),
      payload: { homologatedBy: HOMOLOGATED_BY },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'Active');
    await teardown();
  });

  it('CA5: aditivo inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: homologateUrl(ACTIVE_ID, MISSING_AMEND_ID),
      headers: bearer(token),
      payload: { homologatedBy: HOMOLOGATED_BY },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA5: contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: homologateUrl(MISSING_CONTRACT_ID, AMEND_HOMOLOG_ID),
      headers: bearer(token),
      payload: { homologatedBy: HOMOLOGATED_BY },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA5: aditivo de outro contrato (mismatch) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    // AMEND_MISMATCH pertence a ACTIVE2; path usa ACTIVE (Active) -> passa no parseActive, falha no mismatch.
    const res = await app.inject({
      method: 'POST',
      url: homologateUrl(ACTIVE_ID, AMEND_MISMATCH_ID),
      headers: bearer(token),
      payload: { homologatedBy: HOMOLOGATED_BY },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });
});

// ─── CA7/CA8: OpenAPI + regressão ────────────────────────────────────────────

describe('CONTRACTS-HTTP-WRITES-CORE (C2) — OpenAPI + regressão', () => {
  it('CA7: /docs/json contém as 4 rotas de escrita', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, { post?: unknown }> };
    const has = (p: string): boolean =>
      Object.prototype.hasOwnProperty.call(doc.paths, p) && doc.paths[p]?.post !== undefined;
    assert.ok(has('/api/v2/contracts'), 'POST /contracts');
    assert.ok(has('/api/v2/contracts/{id}/activate'), 'POST /{id}/activate');
    assert.ok(has('/api/v2/contracts/{id}/amendments'), 'POST /{id}/amendments');
    assert.ok(has('/api/v2/contracts/{id}/amendments/{amendmentId}/homologate'), 'POST homologate');
    await teardown();
  });

  it('CA8 (regressão): GET /contracts/:id (read C1) segue funcional com contract:write', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, WRITER_EMAIL);
    // Token só tem contract:write, não contract:read -> read C1 deve dar 403 (RBAC fino preservado).
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${ACTIVE_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });
});
