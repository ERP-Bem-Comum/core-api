/**
 * W0 (RED) - AUTH-HTTP-UPDATE-USER: PUT /api/v1/users/:id (editar perfil + RBAC).
 *
 * DEVE FALHAR em W0 - a rota PUT /api/v1/users/:id ainda nao existe (deps.updateUserProfile).
 * Driver memory. Cria usuarios via POST /users (user:create) e edita via PUT. fastify.inject.
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
const ADMIN = 'admin.update@example.com';
const NOPERM = 'noperm.update@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: ADMIN,
          password: STRONG,
          permissions: ['user:create', 'user:read', 'user:update'],
        },
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

const createUser = async (
  app: AppHandle,
  token: string,
  overrides: Partial<{ name: string; cpf: string; email: string; telephone: string }> = {},
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: 'Amanda Manoel',
      cpf: '52998224725',
      email: 'amanda.upd@example.com',
      telephone: '15997133502',
      ...overrides,
    },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { id: string }).id;
};

describe('AUTH-HTTP-UPDATE-USER — PUT /api/v1/users/:id', () => {
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

  it('CA1: 401 sem token', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/qualquer-id',
      payload: { name: 'Novo' },
    });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: 403 sem permissao user:update', async () => {
    const token = await login(app, NOPERM);
    const id = await createUser(app, adminToken, {
      email: 'ca2.upd@example.com',
    });
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Novo' },
    });
    assert.equal(res.statusCode, 403);
  });

  it('CA3: 200 edita nome/telefone; detalhe reflete; demais preservados', async () => {
    const id = await createUser(app, adminToken, { email: 'ca3.upd@example.com' });
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Amanda Souza', telephone: '15991111111' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { name: string; telephone: string; cpf: string; email: string };
    assert.equal(body.name, 'Amanda Souza');
    assert.equal(body.telephone, '15991111111');
    assert.equal(body.cpf, '52998224725');
    assert.equal(body.email, 'ca3.upd@example.com');
  });

  it('CA4: 409 ao trocar email para o de outro usuario', async () => {
    const ocupado = 'ocupado.upd@example.com';
    await createUser(app, adminToken, { email: ocupado });
    const id = await createUser(app, adminToken, { email: 'ca4.upd@example.com' });
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { email: ocupado },
    });
    assert.equal(res.statusCode, 409);
  });

  it('CA5: 422 com cpf invalido', async () => {
    const id = await createUser(app, adminToken, { email: 'ca5.upd@example.com' });
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { cpf: '11111111111' },
    });
    assert.equal(res.statusCode, 422);
  });

  it('CA6: 404 para id inexistente', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/00000000-0000-4000-8000-000000000000',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Fantasma' },
    });
    assert.equal(res.statusCode, 404);
  });
});
