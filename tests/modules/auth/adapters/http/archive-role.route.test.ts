/**
 * W0 (RED) - AUTH-ARCHIVE-ROLE: PATCH /api/v1/roles/:id/deactivate (US7 spec 006).
 *
 * DEVE FALHAR em W0 - a rota de desativacao ainda nao existe. Driver memory; fastify.inject.
 * Permission de hook: role:update. Cobre 200 (papel desativado: active false), 409 (papel ainda
 * atribuido a usuarios -> bloqueado, FR-012), 403 (sem role:update), 401 (sem token) e 404 (id
 * inexistente). ASCII puro.
 *
 * Observacao sobre o 409: no driver memory o RoleRepository.isInUse e governado por markInUse
 * (simula a juncao auth_user_role), NAO pela atribuicao real via HTTP. buildAuthHttpDeps nao
 * expoe o store; por isso as rotas de roles (createRole/listRoles/updateRole/archiveRole) sao
 * cabladas sobre um InMemoryRoleStore proprio que o teste controla. Auth/login continuam vindo
 * de buildAuthHttpDeps (as permissoes do admin vivem no agregado User, nao no role store).
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
import { makeInMemoryRoleStore } from '#src/modules/auth/adapters/persistence/repos/role-repository.in-memory.ts';
import { listRoles } from '#src/modules/auth/application/use-cases/list-roles.ts';
import { createRole } from '#src/modules/auth/application/use-cases/create-role.ts';
import { updateRole } from '#src/modules/auth/application/use-cases/update-role.ts';
import { archiveRole } from '#src/modules/auth/application/use-cases/archive-role.ts';
import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN = 'admin.archive-role@example.com';
const NOPERM = 'noperm.archive-role@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{
  app: AppHandle;
  teardown: () => Promise<void>;
  store: ReturnType<typeof makeInMemoryRoleStore>;
}> => {
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
  // Role store proprio (controlavel via markInUse) por tras das rotas de roles.
  const store = makeInMemoryRoleStore();
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: rolesHttpPlugin(
          {
            getUserPermissions: authDeps.getUserPermissions,
            listPermissionCatalog: authDeps.listPermissionCatalog,
            listRoles: listRoles({ roleRepository: store.repository }),
            assignRole: authDeps.assignRole,
            revokeRole: authDeps.revokeRole,
            createRole: createRole({ roleRepository: store.repository }),
            updateRole: updateRole({ roleRepository: store.repository }),
            archiveRole: archiveRole({ roleRepository: store.repository }),
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
  return { app, teardown, store };
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

const createRoleHttp = async (
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

describe('AUTH-ARCHIVE-ROLE — PATCH /api/v1/roles/:id/deactivate', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let store: ReturnType<typeof makeInMemoryRoleStore>;
  let adminToken: string;

  before(async () => {
    ({ app, teardown, store } = await makeApp());
    adminToken = await login(app, ADMIN);
  });

  after(async () => {
    await teardown();
  });

  it('401 sem token', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/roles/00000000-0000-4000-8000-000000000000/deactivate',
    });
    assert.equal(res.statusCode, 401);
  });

  it('403 sem role:update', async () => {
    const id = await createRoleHttp(app, adminToken, 'desativavel-403', ['role:read']);
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${id}/deactivate`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('200 desativa o papel (active false)', async () => {
    const id = await createRoleHttp(app, adminToken, 'desativavel-200', ['role:read']);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      id: string;
      name: string;
      active: boolean;
      permissions: string[];
    };
    assert.equal(body.id, id);
    assert.equal(body.name, 'desativavel-200');
    assert.equal(body.active, false);
  });

  it('409 papel ainda atribuido a usuarios (FR-012)', async () => {
    const id = await createRoleHttp(app, adminToken, 'em-uso-409', ['role:read']);
    // Simula a juncao auth_user_role: o papel esta atribuido a ao menos um usuario.
    const roleId = RoleId.rehydrate(id);
    assert.equal(roleId.ok, true);
    if (!roleId.ok) return;
    store.markInUse(roleId.value);

    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 409);
  });

  it('404 id inexistente', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/roles/00000000-0000-4000-8000-000000000000/deactivate',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 404);
  });
});
