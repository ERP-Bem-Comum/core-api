/**
 * W0 (RED) - AUTH-ASSIGN-REVOKE-ROLE: POST/DELETE /api/v1/users/:id/roles[/:roleId] (US4 spec 006).
 *
 * DEVE FALHAR em W0 - as rotas de escrita ainda nao existem. Driver memory; fastify.inject.
 * O use case autoriza internamente (user:assign-role); a rota so exige requireAuth. Cobre
 * idempotencia (2o POST/DELETE -> 200) e a protecao FR-010 (auto-lockout -> 422). ASCII puro.
 *
 * Seed: o admin recebe um role de gestao (user:assign-role + role:read). O role-alvo a atribuir/
 * revogar e o role 'seed:<assignable>' (permissions vazias), descoberto via GET /api/v1/roles.
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
const ADMIN = 'admin.assign@example.com';
const NOPERM = 'noperm.assign@example.com';
const ASSIGNABLE = 'assignable.assign@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ['user:assign-role', 'role:read'] },
        { email: NOPERM, password: STRONG, permissions: ['role:read'] },
        { email: ASSIGNABLE, password: STRONG, permissions: [] },
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

const myId = async (app: AppHandle, token: string): Promise<string> => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/auth/me',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return (res.json() as { userId: string }).userId;
};

interface RoleListItem {
  id: string;
  name: string;
  active: boolean;
  permissions: string[];
}

const listRoles = async (app: AppHandle, token: string): Promise<RoleListItem[]> => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v1/roles',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return (res.json() as { items: RoleListItem[] }).items;
};

describe('AUTH-ASSIGN-REVOKE-ROLE — POST/DELETE /api/v1/users/:id/roles', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;
  let adminId: string;
  // Role-alvo (permissions vazias) que pode ser atribuido/revogado sem afetar a gestao.
  let assignableRoleId: string;
  // Role de gestao do admin (contem user:assign-role) -> auto-revoke deve dar lockout.
  let managementRoleId: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    adminToken = await login(app, ADMIN);
    adminId = await myId(app, adminToken);
    const roles = await listRoles(app, adminToken);
    const assignable = roles.find((r) => r.permissions.length === 0);
    assert.ok(assignable, 'esperava um role de permissions vazias (seed:assignable)');
    assignableRoleId = assignable.id;
    const management = roles.find((r) => r.permissions.includes('user:assign-role'));
    assert.ok(management, 'esperava o role de gestao do admin');
    managementRoleId = management.id;
  });

  after(async () => {
    await teardown();
  });

  it('401 POST sem token', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${adminId}/roles`,
      payload: { roleId: assignableRoleId },
    });
    assert.equal(res.statusCode, 401);
  });

  it('403 POST sem user:assign-role', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${adminId}/roles`,
      headers: { authorization: `Bearer ${token}` },
      payload: { roleId: assignableRoleId },
    });
    assert.equal(res.statusCode, 403);
  });

  it('200 POST atribui role, idempotente no 2o POST', async () => {
    const first = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${adminId}/roles`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { roleId: assignableRoleId },
    });
    assert.equal(first.statusCode, 200);

    const second = await app.inject({
      method: 'POST',
      url: `/api/v1/users/${adminId}/roles`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { roleId: assignableRoleId },
    });
    assert.equal(second.statusCode, 200);
  });

  it('200 DELETE revoga role, idempotente no 2o DELETE', async () => {
    // Garante o role atribuido antes (idempotente).
    await app.inject({
      method: 'POST',
      url: `/api/v1/users/${adminId}/roles`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { roleId: assignableRoleId },
    });

    const first = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${adminId}/roles/${assignableRoleId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(first.statusCode, 200);

    const second = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${adminId}/roles/${assignableRoleId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(second.statusCode, 200);
  });

  it('422 DELETE auto-lockout (admin revoga o proprio role de gestao)', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${adminId}/roles/${managementRoleId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 422);
  });

  it('401 DELETE sem token', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${adminId}/roles/${assignableRoleId}`,
    });
    assert.equal(res.statusCode, 401);
  });
});
