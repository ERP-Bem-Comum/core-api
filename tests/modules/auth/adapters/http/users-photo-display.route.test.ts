/**
 * W0 (RED) - GET /api/v1/users/:id/photo (USR-ME-PHOTO-DISPLAY, lado admin).
 *
 * DEVE FALHAR em W0 - a rota GET nao existe. Mesma permissao de leitura do GET /users/:id
 * (`user:read`); 200 bytes para alvo com foto; 403 sem permissao; 404 para alvo sem foto ou
 * inexistente; 400 id malformado. Driver memory. fastify.inject. ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  usersHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const ADMIN = 'admin.photo.display@example.com';
const NOPERM = 'noperm.photo.display@example.com';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

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

let seq = 0;
const createUser = async (app: AppHandle, token: string): Promise<string> => {
  seq += 1;
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/users',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: 'Foto Display User',
      cpf: '52998224725',
      email: `foto.display${seq}@example.com`,
      telephone: '15997133502',
    },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { id: string }).id;
};

const putPhoto = (app: AppHandle, token: string, id: string) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/users/${id}/photo?mimeType=image%2Fjpeg`,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
    payload: JPEG,
  });

const getPhoto = (app: AppHandle, token: string | null, id: string) =>
  app.inject({
    method: 'GET',
    url: `/api/v1/users/${id}/photo`,
    headers: token !== null ? { authorization: `Bearer ${token}` } : {},
  });

describe('USR-ME-PHOTO-DISPLAY — GET /api/v1/users/:id/photo', () => {
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

  it('CA1: alvo com foto + user:read -> 200, bytes e Content-Type do upload', async () => {
    const id = await createUser(app, adminToken);
    const up = await putPhoto(app, adminToken, id);
    assert.equal(up.statusCode, 200);

    const res = await getPhoto(app, adminToken, id);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/jpeg');
    assert.deepEqual(res.rawPayload, JPEG);
  });

  it('CA2: sem user:read -> 403', async () => {
    const id = await createUser(app, adminToken);
    await putPhoto(app, adminToken, id);
    const token = await login(app, NOPERM);
    const res = await getPhoto(app, token, id);
    assert.equal(res.statusCode, 403);
  });

  it('CA3: alvo sem foto -> 404', async () => {
    const id = await createUser(app, adminToken);
    const res = await getPhoto(app, adminToken, id);
    assert.equal(res.statusCode, 404);
  });

  it('CA4: usuario inexistente -> 404', async () => {
    const res = await getPhoto(app, adminToken, randomUUID());
    assert.equal(res.statusCode, 404);
  });

  it('CA5: id malformado -> 400', async () => {
    const res = await getPhoto(app, adminToken, 'nao-e-uuid');
    assert.equal(res.statusCode, 400);
  });

  it('CA6: sem token -> 401', async () => {
    const id = await createUser(app, adminToken);
    const res = await getPhoto(app, null, id);
    assert.equal(res.statusCode, 401);
  });
});
