/**
 * W0 (RED) - AUTH-CREATE-ROLE: POST /api/v1/roles (US5 spec 006).
 *
 * DEVE FALHAR em W0 - a rota de criacao ainda nao existe. Driver memory; fastify.inject.
 * Permission de hook: role:create. Cobre 201 { id }, 409 (nome duplicado), 422 (permissao fora
 * do catalogo / nome vazio), 403 (sem role:create) e 401 (sem token). ASCII puro.
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
const ADMIN = 'admin.create-role@example.com';
const NOPERM = 'noperm.create-role@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ['role:create', 'role:read'] },
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
            archiveRole: authDeps.archiveRole,
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

describe('AUTH-CREATE-ROLE — POST /api/v1/roles', () => {
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
      method: 'POST',
      url: '/api/v1/roles',
      payload: { name: 'auditor', permissions: ['role:read'] },
    });
    assert.equal(res.statusCode, 401);
  });

  it('403 sem role:create', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'auditor', permissions: ['role:read'] },
    });
    assert.equal(res.statusCode, 403);
  });

  it('201 cria papel com { id }', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'gerente-de-acessos', permissions: ['role:read', 'user:list'] },
    });
    assert.equal(res.statusCode, 201);
    const body = res.json() as { id: string };
    assert.equal(typeof body.id, 'string');
    assert.ok(body.id.length > 0);
    // HTTP-LOCATION-HEADER-201: 201 traz Location apontando para o recurso criado.
    assert.equal(res.headers.location, `/api/v1/roles/${body.id}`);
  });

  it('409 nome duplicado', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'supervisor', permissions: ['role:read'] },
    });
    assert.equal(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'supervisor', permissions: ['user:list'] },
    });
    assert.equal(second.statusCode, 409);
  });

  it('422 permissao fora do catalogo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'estranho', permissions: ['nonexistent:permission'] },
    });
    assert.equal(res.statusCode, 422);
  });

  it('422 nome vazio', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: '   ', permissions: ['role:read'] },
    });
    assert.equal(res.statusCode, 422);
  });
});
