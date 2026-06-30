/**
 * W0 (RED) - AUTH-HTTP-STATUS: PATCH /api/v1/users/:id/activate|deactivate (US5).
 *
 * DEVE FALHAR em W0 - as rotas PATCH ainda nao existem (deps.activateUser/deactivateUser).
 * Driver memory. Cria usuarios via POST /users e transita status via PATCH. fastify.inject.
 * ASCII puro.
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
const ADMIN = 'admin.status@example.com';
const NOPERM = 'noperm.status@example.com';
const ADMIN_PERMS = ['user:create', 'user:read', 'user:list', 'user:activate', 'user:deactivate'];

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ADMIN_PERMS },
        { email: NOPERM, password: STRONG, permissions: ['user:create'] },
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

let emailSeq = 0;
const createUser = async (app: AppHandle, token: string): Promise<string> => {
  emailSeq += 1;
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: 'Amanda Manoel',
      cpf: '52998224725',
      email: `status${emailSeq}@example.com`,
      telephone: '15997133502',
    },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { id: string }).id;
};

const isActive = async (app: AppHandle, token: string, id: string): Promise<boolean> => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/users/${id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return (res.json() as { active: boolean }).active;
};

describe('AUTH-HTTP-STATUS — PATCH /api/v1/users/:id/activate|deactivate', () => {
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

  it('CA1: 401 sem token (deactivate)', async () => {
    const res = await app.inject({ method: 'PATCH', url: '/api/v1/users/x/deactivate' });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: 403 sem permissao user:deactivate', async () => {
    const token = await login(app, NOPERM);
    const id = await createUser(app, adminToken);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${id}/deactivate`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('CA3: deactivate de usuario ativo -> 200; detalhe active=false', async () => {
    const id = await createUser(app, adminToken);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(await isActive(app, adminToken, id), false);
  });

  it('CA4: activate de usuario inativo -> 200; detalhe active=true', async () => {
    const id = await createUser(app, adminToken);
    await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${id}/activate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(await isActive(app, adminToken, id), true);
  });

  it('CA5: deactivate repetido (ja inativo) -> 200 idempotente', async () => {
    const id = await createUser(app, adminToken);
    const first = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(first.statusCode, 200);
    const second = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(second.statusCode, 200);
  });

  it('CA6: admin desativa a propria conta -> 422 cannot-deactivate-self', async () => {
    // Descobre o proprio id via listagem (admin do seed nao tem nome -> nao da p/ buscar por nome).
    const list = await app.inject({
      method: 'GET',
      url: `/api/v1/users?pageSize=25&status=all`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(list.statusCode, 200);
    const items = (list.json() as { items: { id: string; email: string }[] }).items;
    const me = items.find((u) => u.email === ADMIN);
    assert.ok(me !== undefined, 'admin deve aparecer na listagem');
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/users/${me.id}/deactivate`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 422);
  });

  it('CA7: 404 para id inexistente (activate)', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/users/00000000-0000-4000-8000-000000000000/activate',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 404);
  });
});
