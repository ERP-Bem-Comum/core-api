/**
 * W0 (RED) - AUTH-HTTP-ME: GET/PUT /api/v1/me + POST /api/v1/me/password-reset (US7).
 *
 * DEVE FALHAR em W0 - meHttpPlugin ainda nao existe. Self por construcao (req.userId do JWT).
 * Driver memory. fastify.inject. ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  usersHttpPlugin,
  meHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const SELF = 'self.me@example.com';
const ADMIN = 'admin.me@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: SELF, password: STRONG, permissions: [] },
        { email: ADMIN, password: STRONG, permissions: ['user:create', 'user:update'] },
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
      {
        plugin: meHttpPlugin(
          {
            getUser: authDeps.getUser,
            updateUserProfile: authDeps.updateUserProfile,
            requestPasswordReset: authDeps.requestPasswordReset,
            setProfilePhoto: authDeps.setProfilePhoto,
            removeProfilePhoto: authDeps.removeProfilePhoto,
          },
          { requireAuth },
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

describe('AUTH-HTTP-ME — minha conta', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let selfToken: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    selfToken = await login(app, SELF);
  });

  after(async () => {
    await teardown();
  });

  it('CA1: GET /me sem token -> 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/me' });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: GET /me -> 200 com o proprio perfil', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${selfToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { email: string }).email, SELF);
  });

  it('CA3: PUT /me altera nome/telefone -> 200; reflete', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${selfToken}` },
      payload: { name: 'Self Nome', telephone: '15991111111' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { name: string; telephone: string };
    assert.equal(body.name, 'Self Nome');
    assert.equal(body.telephone, '15991111111');
  });

  it('CA4: PUT /me sem token -> 401', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      payload: { name: 'X' },
    });
    assert.equal(res.statusCode, 401);
  });

  it('CA5: POST /me/password-reset -> 202', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/me/password-reset',
      headers: { authorization: `Bearer ${selfToken}` },
    });
    assert.equal(res.statusCode, 202);
  });

  it('CA6: usuario comum nao edita terceiro via PUT /users/:id -> 403', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/users/00000000-0000-4000-8000-000000000000',
      headers: { authorization: `Bearer ${selfToken}` },
      payload: { name: 'Hack' },
    });
    assert.equal(res.statusCode, 403);
  });
});
