/**
 * USR-ME-PHOTO — W0 (RED) — PUT/DELETE /api/v1/me/photo (autosserviço).
 *
 * DEVE FALHAR: o `meHttpPlugin` ainda não expõe rotas de foto (404). GREEN quando o W1 espelhar as rotas
 * admin (`/users/:id/photo`) no autosserviço, com `targetId = req.userId` (sem exigir `user:update`).
 * Driver memory (storage de foto in-memory). fastify.inject. ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  meHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const SELF = 'self.photo@example.com';

// PNG mínimo: assinatura de 8 bytes + alguns bytes de corpo (magicBytesMatch só confere o início).
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01, 0x02, 0x03]);

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: SELF, password: STRONG, permissions: [] }] },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
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

const putPhoto = (app: AppHandle, token: string | null, mimeType: string, body: Buffer) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/me/photo?mimeType=${encodeURIComponent(mimeType)}`,
    headers: {
      'content-type': 'application/octet-stream',
      ...(token !== null ? { authorization: `Bearer ${token}` } : {}),
    },
    payload: body,
  });

describe('USR-ME-PHOTO — PUT/DELETE /api/v1/me/photo', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let token: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    token = await login(app, SELF);
  });

  after(async () => {
    await teardown();
  });

  it('CA1: PUT /me/photo (PNG válido) -> 200; GET /me reflete imageUrl', async () => {
    const res = await putPhoto(app, token, 'image/png', PNG);
    assert.equal(res.statusCode, 200);
    const get = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${token}` },
    });
    const imageUrl = (get.json() as { imageUrl?: string | null }).imageUrl;
    assert.ok(imageUrl !== undefined && imageUrl !== null && imageUrl.length > 0);
  });

  it('CA2: PUT /me/photo sem token -> 401', async () => {
    const res = await putPhoto(app, null, 'image/png', PNG);
    assert.equal(res.statusCode, 401);
  });

  it('CA3: PUT /me/photo com mimeType fora da allowlist -> 422', async () => {
    const res = await putPhoto(app, token, 'image/gif', PNG);
    assert.equal(res.statusCode, 422);
  });

  it('CA4: PUT /me/photo com bytes que não casam o mimeType -> 422', async () => {
    const notPng = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
    const res = await putPhoto(app, token, 'image/png', notPng);
    assert.equal(res.statusCode, 422);
  });

  it('CA5: DELETE /me/photo -> 200', async () => {
    await putPhoto(app, token, 'image/png', PNG);
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/v1/me/photo',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
  });
});
