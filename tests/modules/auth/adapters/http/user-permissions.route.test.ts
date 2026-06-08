/**
 * W0 (RED) - AUTH-GET-USER-PERMISSIONS: GET /api/v1/users/:id/permissions (US1 da spec 006).
 *
 * DEVE FALHAR em W0 - a rota /api/v1/users/:id/permissions ainda nao existe.
 * Driver memory; fastify.inject. Permission role:read (fail-closed). ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  rolesHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN = 'admin.perms@example.com';
const NOPERM = 'noperm.perms@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ['role:read'] },
        { email: NOPERM, password: STRONG, permissions: [] },
      ],
    },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: rolesHttpPlugin(
          { getUserPermissions: authDeps.getUserPermissions },
          { requireAuth, authorize: authDeps.authorize },
        ),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: AppHandle, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  assert.equal(res.statusCode, 200);
  return (res.json() as { accessToken: string }).accessToken;
};

describe('AUTH-GET-USER-PERMISSIONS — GET /api/v1/users/:id/permissions', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;
  let targetId: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    adminToken = await login(app, ADMIN);
    // O proprio admin (seed role:read) serve de alvo com permissoes conhecidas.
    const me = await app.inject({
      method: 'GET',
      url: '/api/v2/auth/me',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(me.statusCode, 200);
    targetId = (me.json() as { userId: string }).userId;
  });

  after(async () => {
    await teardown();
  });

  it('401 sem token', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${targetId}/permissions`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('403 sem permissao role:read', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${targetId}/permissions`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('200 com { permissions: [...] }', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${targetId}/permissions`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { permissions: string[] };
    assert.ok(Array.isArray(body.permissions));
    assert.ok(body.permissions.includes('role:read'));
  });

  it('404 usuario inexistente (valido)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/00000000-0000-4000-8000-000000000000/permissions',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 404);
  });
});
