/**
 * W0 (RED) - AUTH-LIST-ROLES: GET /api/v1/roles (US3 da spec 006).
 *
 * DEVE FALHAR em W0 - a rota /api/v1/roles ainda nao existe.
 * Driver memory; fastify.inject. Permission role:read (fail-closed). Espelha
 * permissions-catalog.route.test.ts (US2). O seed RBAC cria um Role `seed:<email>` por
 * usuario semeado com as permissions inline; o admin (role:read) gera um Role ativo
 * consultavel pela rota. ASCII puro.
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
const ADMIN = 'admin.roles@example.com';
const NOPERM = 'noperm.roles@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ['role:read', 'user:list'] },
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
            listRoles: authDeps.listRoles,
            assignRole: authDeps.assignRole,
            revokeRole: authDeps.revokeRole,
            createRole: authDeps.createRole,
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

interface RoleListItem {
  id: string;
  name: string;
  active: boolean;
  permissions: string[];
}

describe('AUTH-LIST-ROLES — GET /api/v1/roles', () => {
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
    const res = await app.inject({ method: 'GET', url: '/api/v1/roles' });
    assert.equal(res.statusCode, 401);
  });

  it('403 sem permissao role:read', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('200 com { items: [...] } incluindo um role ativo com permissoes', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: RoleListItem[] };
    assert.ok(Array.isArray(body.items));
    assert.ok(body.items.length >= 1);
    // O Role semeado p/ o admin carrega role:read + user:list e nasce ativo.
    const adminRole = body.items.find((r) => r.permissions.includes('role:read'));
    assert.ok(adminRole, 'esperava um role com role:read');
    assert.equal(adminRole.active, true);
    assert.ok(adminRole.permissions.includes('user:list'));
    assert.equal(typeof adminRole.id, 'string');
    assert.ok(adminRole.id.length > 0);
    assert.equal(typeof adminRole.name, 'string');
  });
});
