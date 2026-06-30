/**
 * W0 (RED) — FIN-APPROVER-LIMIT-AUTH (#289), US2/CA8: alcada na borda de papeis.
 *
 * POST/PUT /api/v1/roles aceitam `approvalLimitCents` (int >= 0, nullable); GET/PUT refletem
 * o campo no DTO do papel. Negativo/nao-inteiro -> 400 (validacao Zod na borda).
 *
 * DEVE FALHAR em W0 — schemas/plugin/use-cases ainda nao tratam approvalLimitCents.
 * Driver memory; fastify.inject (sem Docker). ASCII puro.
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
const ADMIN = 'admin.alcada@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: ADMIN,
          password: STRONG,
          permissions: ['role:read', 'role:create', 'role:update'],
        },
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

interface RoleItem {
  id: string;
  name: string;
  active: boolean;
  permissions: string[];
  approvalLimitCents: number | null;
}

describe('AUTH-ROLE-APPROVAL-LIMIT — alcada na borda de papeis (US2)', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let token: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    token = await login(app, ADMIN);
  });

  after(async () => {
    await teardown();
  });

  const auth = (): Record<string, string> => ({ authorization: `Bearer ${token}` });

  it('CA8: POST /roles com approvalLimitCents cria e GET reflete a alcada', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: auth(),
      payload: {
        name: 'Gerente Financeiro',
        permissions: ['payable:approve'],
        approvalLimitCents: 100000,
      },
    });
    assert.equal(created.statusCode, 201);
    const id = (created.json() as { id: string }).id;

    const listed = await app.inject({ method: 'GET', url: '/api/v1/roles', headers: auth() });
    assert.equal(listed.statusCode, 200);
    const role = (listed.json() as { items: RoleItem[] }).items.find((r) => r.id === id);
    assert.ok(role, 'esperava o papel recem-criado na listagem');
    assert.equal(role.approvalLimitCents, 100000);
  });

  it('CA8: PUT /roles/:id define e zera a alcada', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: auth(),
      payload: { name: 'Diretor Financeiro', permissions: ['payable:approve'] },
    });
    assert.equal(created.statusCode, 201);
    const id = (created.json() as { id: string }).id;

    const set = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${id}`,
      headers: auth(),
      payload: { approvalLimitCents: 50000 },
    });
    assert.equal(set.statusCode, 200);
    assert.equal((set.json() as RoleItem).approvalLimitCents, 50000);

    const cleared = await app.inject({
      method: 'PUT',
      url: `/api/v1/roles/${id}`,
      headers: auth(),
      payload: { approvalLimitCents: null },
    });
    assert.equal(cleared.statusCode, 200);
    assert.equal((cleared.json() as RoleItem).approvalLimitCents, null);
  });

  it('CA8: POST /roles com approvalLimitCents negativo -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: auth(),
      payload: { name: 'Papel Invalido', permissions: [], approvalLimitCents: -1 },
    });
    assert.equal(res.statusCode, 400);
  });

  it('CA8: POST /roles com approvalLimitCents acima de MAX_SAFE_INTEGER -> 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/roles',
      headers: auth(),
      payload: {
        name: 'Papel Overflow',
        permissions: [],
        approvalLimitCents: Number.MAX_SAFE_INTEGER + 1,
      },
    });
    assert.equal(res.statusCode, 400);
  });
});
