/**
 * SUPPLIERS-HTTP-LIFECYCLE (S3) — W0 (RED) — deactivate + reactivate de fornecedor.
 *
 * DEVE FALHAR: as rotas POST /:id/deactivate e /:id/reactivate e os use cases no composition
 * ainda nao existem. GREEN quando o W1 entregar as duas rotas (writer; deactivate sem body —
 * supplier nao tem disableBy).
 *
 * Fluxo no mesmo writer repo: POST cadastro -> deactivate -> reactivate.
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
  suppliersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { SUPPLIER_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'compras.editor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const VALID_BODY = {
  name: 'Fornecedor X',
  email: 'contato@fornecedor.com.br',
  cnpj: '11222333000181',
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [{ email: WRITER_EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.write] }],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: suppliersHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
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
  return login(app, email);
};

const createOne = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/suppliers',
    headers: { authorization: `Bearer ${token}` },
    payload: VALID_BODY,
  });
  return (res.headers['location'] ?? '').slice('/api/v1/suppliers/'.length);
};

const deactivate = async (app: Awaited<ReturnType<typeof buildApp>>, token: string, id: string) => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/suppliers/${id}/deactivate`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
  return res;
};

const reactivate = async (app: Awaited<ReturnType<typeof buildApp>>, token: string, id: string) => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/suppliers/${id}/reactivate`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
  return res;
};

describe('SUPPLIERS-HTTP-LIFECYCLE (S3) — deactivate', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/suppliers/${UUID_INEXISTENTE}/deactivate`,
      payload: {},
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem supplier:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await deactivate(app, token, UUID_INEXISTENTE)).statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await deactivate(app, token, 'nao-uuid')).statusCode, 400);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await deactivate(app, token, UUID_INEXISTENTE)).statusCode, 404);
    await teardown();
  });

  it('CA: ativo -> 200; segunda vez -> 409 (already-inactive)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    assert.equal((await deactivate(app, token, id)).statusCode, 200);
    assert.equal((await deactivate(app, token, id)).statusCode, 409);
    await teardown();
  });
});

describe('SUPPLIERS-HTTP-LIFECYCLE (S3) — reactivate', () => {
  it('CA: inativo -> 200; ativo -> 409 (already-active)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    await deactivate(app, token, id);
    assert.equal((await reactivate(app, token, id)).statusCode, 200);
    assert.equal((await reactivate(app, token, id)).statusCode, 409);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await reactivate(app, token, UUID_INEXISTENTE)).statusCode, 404);
    await teardown();
  });
});
