/**
 * W0 (RED) - AUTH-UPDATE-ROLE: PUT /api/v1/roles/:id (US6 spec 006).
 *
 * DEVE FALHAR em W0 - a rota de edicao ainda nao existe. Driver memory; fastify.inject.
 * Permission de hook: role:update. Cobre 200 (papel atualizado: name + permissions),
 * 409 (nome duplicado), 422 (permissao fora do catalogo), 403 (sem role:update), 401 (sem
 * token) e 404 (id inexistente). ASCII puro.
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
const ADMIN = 'admin.update-role@example.com';
const NOPERM = 'noperm.update-role@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: ADMIN,
          password: STRONG,
          permissions: ['role:create', 'role:read', 'role:update'],
        },
        { email: NOPERM, password: STRONG, permissions: ['role:read'] },
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
            updateRole: authDeps.updateRole,
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

const createRole = async (
  app: AppHandle,
  token: string,
  name: string,
  permissions: readonly string[],
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/roles',
    headers: { authorization: `Bearer ${token}` },
    payload: { name, permissions },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { id: string }).id;
};

describe('AUTH-UPDATE-ROLE — PUT /api/v1/roles/:id', () => {
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
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/roles/00000000-0000-4000-8000-000000000000',
      payload: { name: 'qualquer' },
    });
    assert.equal(res.statusCode, 401);
  });

  it('403 sem role:update', async () => {
    const id = await createRole(app, adminToken, 'editavel-403', ['role:read']);
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'novo-nome-403' },
    });
    assert.equal(res.statusCode, 403);
  });

  it('200 atualiza papel (name + permissions)', async () => {
    const id = await createRole(app, adminToken, 'editavel-200', ['role:read']);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'editado-200', permissions: ['role:read', 'user:list'] },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      id: string;
      name: string;
      active: boolean;
      permissions: string[];
    };
    assert.equal(body.id, id);
    assert.equal(body.name, 'editado-200');
    assert.equal(body.active, true);
    assert.deepEqual([...body.permissions].sort(), ['role:read', 'user:list']);
  });

  it('409 nome duplicado (de outro papel)', async () => {
    await createRole(app, adminToken, 'ocupado-409', ['role:read']);
    const id = await createRole(app, adminToken, 'origem-409', ['role:read']);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'ocupado-409' },
    });
    assert.equal(res.statusCode, 409);
  });

  it('422 permissao fora do catalogo', async () => {
    const id = await createRole(app, adminToken, 'editavel-422', ['role:read']);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { permissions: ['nonexistent:permission'] },
    });
    assert.equal(res.statusCode, 422);
  });

  it('404 id inexistente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/roles/00000000-0000-4000-8000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'fantasma' },
    });
    assert.equal(res.statusCode, 404);
  });
});
