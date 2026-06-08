/**
 * W0 (RED) - AUTH-PERMISSIONS-CATALOG: GET /api/v1/permissions (US2 da spec 006).
 *
 * DEVE FALHAR em W0 - a rota /api/v1/permissions ainda nao existe.
 * Driver memory; fastify.inject. Permission role:read (fail-closed). Catalogo read-only:
 * sem rotas de escrita (FR-011). Espelha user-permissions.route.test.ts (US1). ASCII puro.
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
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN = 'admin.catalog@example.com';
const NOPERM = 'noperm.catalog@example.com';

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
          {
            getUserPermissions: authDeps.getUserPermissions,
            listPermissionCatalog: authDeps.listPermissionCatalog,
          },
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

describe('AUTH-PERMISSIONS-CATALOG — GET /api/v1/permissions', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    adminToken = await login(app, ADMIN);
  });

  after(async () => {
    await teardown();
  });

  it('401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/permissions' });
    assert.equal(res.statusCode, 401);
  });

  it('403 sem permissao role:read', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/permissions',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('200 com { items: [...] } catalogo completo', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/permissions',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      items: { id: string; resource: string; action: string }[];
    };
    assert.ok(Array.isArray(body.items));
    assert.equal(body.items.length, PermissionCatalog.all.length);
    const ids = body.items.map((item) => item.id);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(ids.includes('role:read'));
    assert.ok(ids.includes('user:list'));
    for (const item of body.items) {
      assert.equal(item.id, `${item.resource}:${item.action}`);
    }
  });

  it('404 em POST /api/v1/permissions (catalogo read-only, sem escrita)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/permissions',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { id: 'role:read' },
    });
    assert.equal(res.statusCode, 404);
  });
});
