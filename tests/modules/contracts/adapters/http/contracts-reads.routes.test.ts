/**
 * CONTRACTS-HTTP-READS (C1) — W0 (RED) — GET /{id} + /{id}/history com RBAC.
 *
 * DEVE FALHAR: as rotas `/contracts/:id` e `/contracts/:id/history` ainda não existem; o
 * `buildAuthHttpDeps` ainda não aceita `seed` nem expõe `authorize`; o `buildContractsHttpDeps`
 * ainda não aceita `seed` nem expõe `getContract`/`getContractTimeline`; o `ContractsHttpHooks`
 * ainda não tem `authorize`. GREEN quando o W1 entregar o seed RBAC inline (auth), o seed de
 * contratos (composition), o hook `authorize` e as 2 rotas.
 *
 * Driver memory (sem Docker). Token COM `contract:read` vem do seed RBAC (D4); token SEM
 * permissão vem do register normal (roles:[]). Contrato existente vem do seed de contratos (D5).
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

import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'reader@example.com'; // seed RBAC: tem 'contract:read'
const PLAIN_EMAIL = 'plain@example.com'; // register normal: roles:[] (sem permissão)
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111'; // id default do buildContract
const MISSING_ID = '22222222-2222-4222-8222-222222222222'; // não seedado

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: CONTRACT_ID })] },
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

const loginSeeded = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return loginSeeded(app, email);
};

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

describe('CONTRACTS-HTTP-READS (C1) — GET /contracts/:id', () => {
  it('CA1: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: `/api/v2/contracts/${CONTRACT_ID}` });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA1: token sem permissão contract:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA1: token com contract:read + id existente -> 200 com o contrato', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { id: string; status: string };
    assert.equal(body.id, CONTRACT_ID);
    assert.equal(body.status, 'Active');
    await teardown();
  });

  it('CA1: token com contract:read + id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${MISSING_ID}`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA4: id em formato inválido -> 400 (validação Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts/not-a-uuid',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });
});

describe('CONTRACTS-HTTP-READS (C1) — GET /contracts/:id/history', () => {
  it('CA2: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}/history`,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA2: token sem permissão -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, PLAIN_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}/history`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA2: token com permissão + contrato existente -> 200 com array (timeline vazia OK)', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${CONTRACT_ID}/history`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    assert.ok(Array.isArray(res.json()));
    await teardown();
  });

  it('CA2: token com permissão + contrato inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await loginSeeded(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/contracts/${MISSING_ID}/history`,
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});

describe('CONTRACTS-HTTP-READS (C1) — contrato OpenAPI + regressão', () => {
  it('CA4: /docs/json contém /api/v2/contracts/{id} e /{id}/history', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/contracts/{id}'));
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/contracts/{id}/history'));
    await teardown();
  });

  it('CA5 (regressão #202): GET /api/v2/contracts (list) exige contract:read — 403 sem, 200 com', async () => {
    const { app, teardown } = await makeApp();
    // Antes do #202 a listagem retornava 200 para qualquer token valido (vazamento).
    // Agora exige contract:read, em paridade com /:id, /:id/history e /export.csv.
    const plain = await registerAndLogin(app, PLAIN_EMAIL);
    const denied = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: bearer(plain),
    });
    assert.equal(denied.statusCode, 403);

    const reader = await loginSeeded(app, READER_EMAIL);
    const allowed = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: bearer(reader),
    });
    assert.equal(allowed.statusCode, 200);
    await teardown();
  });

  it('CA-seed: buildAuthHttpDeps aceita seed RBAC e expõe authorize', async () => {
    const authDeps = await buildAuthHttpDeps({
      driver: 'memory',
      seed: {
        users: [{ email: 'x@example.com', password: STRONG, permissions: ['contract:read'] }],
      },
    });
    assert.equal(typeof authDeps.authorize, 'function');
    await authDeps.shutdown();
  });
});
