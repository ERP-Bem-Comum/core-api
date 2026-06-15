/**
 * W0 (RED) - GET /api/v1/me/photo (USR-ME-PHOTO-DISPLAY).
 *
 * DEVE FALHAR em W0 - a rota GET nao existe (so PUT/DELETE do USR-ME-PHOTO). Serve os bytes da
 * propria foto (proxy de exibicao via BFF/server function, espelho do documents/:id/content):
 * 200 com Content-Type real + Cache-Control private/no-store; 404 sem foto; 401 sem token.
 * Driver memory. fastify.inject. ASCII puro.
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
const WITH_PHOTO = 'with.photo.display@example.com';
const NO_PHOTO = 'no.photo.display@example.com';

// PNG minimo: assinatura + corpo arbitrario (magicBytesMatch confere so o inicio).
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xaa, 0xbb, 0xcc, 0xdd]);

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WITH_PHOTO, password: STRONG, permissions: [] },
        { email: NO_PHOTO, password: STRONG, permissions: [] },
      ],
    },
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
            getProfilePhoto: authDeps.getProfilePhoto,
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

describe('USR-ME-PHOTO-DISPLAY — GET /api/v1/me/photo', () => {
  let app: AppHandle;
  let teardown: () => Promise<void>;
  let token: string;

  before(async () => {
    ({ app, teardown } = await makeApp());
    token = await login(app, WITH_PHOTO);
    const up = await app.inject({
      method: 'PUT',
      url: '/api/v1/me/photo?mimeType=image%2Fpng',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' },
      payload: PNG,
    });
    assert.equal(up.statusCode, 200);
  });

  after(async () => {
    await teardown();
  });

  it('CA1: com foto -> 200, bytes identicos ao upload, Content-Type do upload', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/photo',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.deepEqual(res.rawPayload, PNG);
  });

  it('CA1b: resposta nao e cacheavel (Cache-Control no-store — politica global /api/*)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/photo',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    // `no-store` proibe QUALQUER cache (compartilhado ou privado) — mais forte que `private`.
    // Vem do hook onSend global do buildApp (src/shared/http/app.ts), nao do handler.
    const cache = res.headers['cache-control'] ?? '';
    assert.ok(cache.includes('no-store'), `cache-control sem no-store: "${cache}"`);
  });

  it('CA2: sem foto -> 404 (front cai no fallback de iniciais)', async () => {
    const bare = await login(app, NO_PHOTO);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/me/photo',
      headers: { authorization: `Bearer ${bare}` },
    });
    assert.equal(res.statusCode, 404);
  });

  it('CA3: sem token -> 401', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/v1/me/photo' });
    assert.equal(res.statusCode, 401);
  });
});
