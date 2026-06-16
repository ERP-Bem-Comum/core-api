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

// ---------------------------------------------------------------------------
// AUTH-MASS-APPROVE-SETTABLE - flag massApprovalPermission no PUT /users/:id.
// ADMIN_MA tem user:create + user:update + user:assign-role + user:read.
// WEAK_MA tem user:create + user:update + user:read (sem user:assign-role).
// ---------------------------------------------------------------------------

const ADMIN_MA = 'admin.ma.update@example.com';
const WEAK_MA = 'weak.ma.update@example.com';

const makeMaApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: ADMIN_MA,
          password: STRONG,
          permissions: ['user:create', 'user:update', 'user:assign-role', 'user:read'],
        },
        {
          email: WEAK_MA,
          password: STRONG,
          permissions: ['user:create', 'user:update', 'user:read'],
        },
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

describe('AUTH-MASS-APPROVE-SETTABLE — PUT /api/v1/users/:id (massApprovalPermission)', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;

  before(async () => {
    ({ app, teardown } = await makeMaApp());
    adminToken = await login(app, ADMIN_MA);
  });

  after(async () => {
    await teardown();
  });

  const massApproveOf = async (id: string): Promise<boolean> => {
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(detail.statusCode, 200);
    return (detail.json() as { massApprovalPermission: boolean }).massApprovalPermission;
  };

  it('CA3: PUT com true atribui a role; detalhe reflete true', async () => {
    const id = await createUser(app, adminToken, { email: 'ma3.upd@example.com' });
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { massApprovalPermission: true },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { massApprovalPermission: boolean }).massApprovalPermission, true);
    assert.equal(await massApproveOf(id), true);
  });

  it('CA4: PUT com false revoga a role; detalhe reflete false', async () => {
    const id = await createUser(app, adminToken, { email: 'ma4.upd@example.com' });
    // primeiro concede
    await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { massApprovalPermission: true },
    });
    assert.equal(await massApproveOf(id), true);

    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { massApprovalPermission: false },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { massApprovalPermission: boolean }).massApprovalPermission, false);
    assert.equal(await massApproveOf(id), false);
  });

  it('CA5: PUT sem a flag preserva o estado atual da permissao', async () => {
    const id = await createUser(app, adminToken, { email: 'ma5.upd@example.com' });
    await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { massApprovalPermission: true },
    });
    assert.equal(await massApproveOf(id), true);

    // patch parcial sem a flag: so muda o nome.
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Novo Nome' },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(await massApproveOf(id), true);
  });

  it('CA6: ator sem user:assign-role que seta a flag -> 403', async () => {
    const weakToken = await login(app, WEAK_MA);
    const id = await createUser(app, weakToken, { email: 'ma6.upd@example.com' });
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/users/${id}`,
      headers: { authorization: `Bearer ${weakToken}` },
      payload: { massApprovalPermission: true },
    });
    assert.equal(res.statusCode, 403);
  });
});
