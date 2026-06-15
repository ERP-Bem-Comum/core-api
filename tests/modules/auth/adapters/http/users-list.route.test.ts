/**
 * W0 (RED) - AUTH-HTTP-LIST-USERS: GET /api/v1/users (paginado + filtros + RBAC).
 *
 * DEVE FALHAR em W0 - usersHttpPlugin / a rota /api/v1/users ainda nao existem.
 *
 * Driver memory; sem Docker. fastify.inject exercita a pilha HTTP em memoria
 * (handbook/reference/fastify Testing). Seed: admin com user:list + usuario sem permissao;
 * usuarios extras registrados via /api/v2/auth/register (entram no mesmo store in-memory que
 * o UserQuery le via snapshot). Todos nascem 'active' com name=null (registro sem perfil).
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
const ADMIN_EMAIL = 'admin.users@example.com';
const NO_PERM_EMAIL = 'sem.perm@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

interface UserListBody {
  items: readonly { id: string; name: string | null; email: string; status: string }[];
  meta: {
    currentPage: number;
    itemsPerPage: number;
    itemCount: number;
    totalItems: number;
    totalPages: number;
  };
}

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN_EMAIL, password: STRONG, permissions: ['user:list'] },
        { email: NO_PERM_EMAIL, password: STRONG, permissions: [] },
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

  // +3 usuarios ativos -> total 5 no store (admin + sem-perm + 3 extras).
  for (const email of ['alice@example.com', 'bob@example.com', 'carol@example.com']) {
    await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email, password: STRONG },
    });
  }

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
  assert.equal(res.statusCode, 200, `login ${email}: esperava 200, got ${res.statusCode}`);
  return (res.json() as { accessToken: string }).accessToken;
};

describe('AUTH-HTTP-LIST-USERS — GET /api/v1/users', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let adminToken: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    adminToken = await login(app, ADMIN_EMAIL);
  });

  after(async () => {
    await teardown();
  });

  it('CA1: 401 sem Authorization', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/users' });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: 403 com token sem permissao user:list', async () => {
    const token = await login(app, NO_PERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('CA3: 200 paginado default (page=1, pageSize=5)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as UserListBody;
    assert.equal(body.meta.currentPage, 1);
    assert.equal(body.meta.itemsPerPage, 5);
    assert.equal(body.meta.itemCount, 5);
    assert.equal(body.meta.totalItems, 5);
    assert.equal(body.items.length, 5);
  });

  it('CA4: pageSize=10 valido', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?pageSize=10',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as UserListBody).meta.itemsPerPage, 10);
  });

  it('CA5: 400 pageSize invalido (7) — validacao de querystring (padrao do projeto)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?pageSize=7',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 400);
  });

  it('CA6: status=active retorna so ativos', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?status=active',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    for (const item of (res.json() as UserListBody).items) {
      assert.equal(item.status, 'active');
    }
  });

  it('CA7: status=inactive sem desativados retorna vazio', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?status=inactive',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as UserListBody;
    assert.equal(body.meta.totalItems, 0);
    assert.equal(body.items.length, 0);
  });

  it('CA8: page=2 pageSize=5 com 5 usuarios -> items vazios, meta coerente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/users?page=2&pageSize=5',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as UserListBody;
    assert.equal(body.meta.currentPage, 2);
    assert.equal(body.meta.itemCount, 0);
    assert.equal(body.items.length, 0);
  });
});
