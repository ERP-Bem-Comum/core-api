/**
 * PARTNERS-SERVICE-CATEGORIES-HTTP — W0 (RED) — GET /api/v1/suppliers/service-categories.
 * DEVE FALHAR: a rota não existe (404). `supplier:read`.
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
const READER_EMAIL = 'cat.reader@example.com';
const NOPERM_EMAIL = 'cat.noperm@example.com';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [{ email: READER_EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.read] }],
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

const URL = '/api/v1/suppliers/service-categories';

describe('PARTNERS-SERVICE-CATEGORIES-HTTP — GET /api/v1/suppliers/service-categories', () => {
  it('CA: sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: URL });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem supplier:read → 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: lista as 39 categorias canônicas (com typos legados)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: URL,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as string[];
    assert.equal(Array.isArray(body), true);
    assert.equal(body.length, 39);
    assert.ok(body.includes('TRASPORTE'));
    assert.ok(body.includes('ONGANIZACAO_DE_EVENTOS'));
    await teardown();
  });
});
