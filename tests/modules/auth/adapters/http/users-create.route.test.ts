/**
 * W0 (RED) - AUTH-HTTP-CREATE-USER: POST /api/v1/users (criar + convite + RBAC).
 *
 * DEVE FALHAR em W0 - a rota POST /api/v1/users ainda nao existe (deps.createUserByAdmin).
 * Driver memory; inviteMailer = no-op (convite nao enviado de verdade, mas o use case completa).
 * fastify.inject. ASCII puro.
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
const ADMIN = 'admin.create@example.com';
const NOPERM = 'noperm.create@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: ADMIN, password: STRONG, permissions: ['user:create'] },
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

const validBody = () => ({
  name: 'Amanda Manoel',
  cpf: '52998224725',
  email: 'amanda.nova@example.com',
  telephone: '15997133502',
});

describe('AUTH-HTTP-CREATE-USER — POST /api/v1/users', () => {
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
    const res = await app.inject({ method: 'POST', url: '/api/v1/users', payload: validBody() });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: 403 sem permissao user:create', async () => {
    const token = await login(app, NOPERM);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${token}` },
      payload: validBody(),
    });
    assert.equal(res.statusCode, 403);
  });

  it('CA3: 201 cria usuario valido (retorna id)', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: validBody(),
    });
    assert.equal(res.statusCode, 201);
    const body = res.json() as { id: string };
    assert.ok(typeof body.id === 'string' && body.id.length > 0);
  });

  it('CA4: 409 email duplicado', async () => {
    const dup = { ...validBody(), email: 'dup@example.com' };
    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: dup,
    });
    assert.equal(first.statusCode, 201);
    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: dup,
    });
    assert.equal(second.statusCode, 409);
  });

  it('CA5: 422 cpf invalido', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/users',
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { ...validBody(), email: 'outro@example.com', cpf: '11111111111' },
    });
    assert.equal(res.statusCode, 422);
  });
});
