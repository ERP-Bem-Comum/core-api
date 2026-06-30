/**
 * W0 (RED) - AUTH-GET-USER: GET /api/v1/users/:id (detalhe + RBAC).
 *
 * DEVE FALHAR em W0 - a rota /api/v1/users/:id ainda nao existe.
 * Driver memory; fastify.inject. CA6..CA8 (rota). ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  usersHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN = 'admin.detail@example.com';
const NOPERM = 'noperm.detail@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ['user:read'] },
        { email: NOPERM, password: STRONG, permissions: [] },
      ],
    },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: usersHttpPlugin(
          {
            listUsers: authDeps.listUsers,
            getUser: authDeps.getUser,
            createUserByAdmin: authDeps.createUserByAdmin,
            updateUserProfile: authDeps.updateUserProfile,
            activateUser: authDeps.activateUser,
            deactivateUser: authDeps.deactivateUser,
            setProfilePhoto: authDeps.setProfilePhoto,
            removeProfilePhoto: authDeps.removeProfilePhoto,
            getProfilePhoto: authDeps.getProfilePhoto,
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

const register = async (app: AppHandle, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  assert.equal(res.statusCode, 201, `register ${email}: ${res.statusCode}`);
  return (res.json() as { userId: string }).userId;
};

describe('AUTH-GET-USER — GET /api/v1/users/:id', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;
  let targetId: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    adminToken = await login(app, ADMIN);
    targetId = await register(app, 'alvo@example.com');
  });

  after(async () => {
    await teardown();
  });

  it('CA6a: 401 sem token', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/v1/users/${targetId}` });
    assert.equal(res.statusCode, 401);
  });

  it('CA6b: 403 sem permissao user:read', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${targetId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('CA7: 200 com o shape do detalhe', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${targetId}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'], targetId);
    assert.equal(body['email'], 'alvo@example.com');
    assert.equal(body['active'], true);
    assert.equal(typeof body['massApprovalPermission'], 'boolean');
    assert.ok(
      'cpf' in body && 'telephone' in body && 'imageUrl' in body && 'collaboratorId' in body,
    );
  });

  it('CA8: 404 id inexistente (valido)', async () => {
    // UUID v4 valido mas inexistente
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users/00000000-0000-4000-8000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 404);
  });
});
