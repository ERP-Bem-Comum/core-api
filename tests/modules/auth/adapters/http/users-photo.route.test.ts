/**
 * W0 (RED) - AUTH-HTTP-PHOTO: PUT/DELETE /api/v1/users/:id/photo (US6).
 *
 * DEVE FALHAR em W0 - as rotas de foto ainda nao existem (deps.setProfilePhoto/removeProfilePhoto).
 * Driver memory (in-memory storage). Upload binario (octet-stream) + mimeType na query. fastify.inject.
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
const ADMIN = 'admin.photo@example.com';
const NOPERM = 'noperm.photo@example.com';

const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

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
      name: 'Foto User',
      cpf: '52998224725',
      email: `foto${seq}@example.com`,
      telephone: '15997133502',
    },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { id: string }).id;
};

const putPhoto = (app: AppHandle, token: string, id: string, mimeType: string, body: Buffer) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/users/${id}/photo?mimeType=${encodeURIComponent(mimeType)}`,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
    payload: body,
  });

describe('AUTH-HTTP-PHOTO — PUT/DELETE /api/v1/users/:id/photo', () => {
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
      url: '/api/v1/users/x/photo?mimeType=image/jpeg',
      headers: { 'content-type': 'application/octet-stream' },
      payload: JPEG,
    });
    assert.equal(res.statusCode, 401);
  });

  it('CA2: 403 sem user:update', async () => {
    const token = await login(app, NOPERM);
    const id = await createUser(app, adminToken);
    const res = await putPhoto(app, token, id, 'image/jpeg', JPEG);
    assert.equal(res.statusCode, 403);
  });

  it('CA3: 200 upload JPEG valido; detalhe com imageUrl', async () => {
    const id = await createUser(app, adminToken);
    const res = await putPhoto(app, adminToken, id, 'image/jpeg', JPEG);
    assert.equal(res.statusCode, 200);
    const body = res.json() as { imageUrl: string | null };
    assert.notEqual(body.imageUrl, null);
  });

  it('CA4: 422 mimeType nao suportado', async () => {
    const id = await createUser(app, adminToken);
    const res = await putPhoto(app, adminToken, id, 'application/pdf', JPEG);
    assert.equal(res.statusCode, 422);
  });

  it('CA5: 422 magic bytes divergentes do mimeType', async () => {
    const id = await createUser(app, adminToken);
    // declara png mas envia bytes jpeg
    const res = await putPhoto(app, adminToken, id, 'image/png', JPEG);
    assert.equal(res.statusCode, 422);
  });

  it('CA6: DELETE photo -> 200 e imageUrl null', async () => {
    const id = await createUser(app, adminToken);
    await putPhoto(app, adminToken, id, 'image/png', PNG);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v1/users/${id}/photo`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { imageUrl: string | null }).imageUrl, null);
  });

  it('CA7: 404 id inexistente', async () => {
    const res = await putPhoto(
      app,
      adminToken,
      '00000000-0000-4000-8000-000000000000',
      'image/jpeg',
      JPEG,
    );
    assert.equal(res.statusCode, 404);
  });
});
