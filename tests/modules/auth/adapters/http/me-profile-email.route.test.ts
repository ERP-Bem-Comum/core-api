/**
 * USR-ME-PROFILE-FIELDS — W0 (RED) — e-mail editável no autosserviço (`PUT /api/v1/me`); CPF imutável.
 *
 * DEVE FALHAR: `meUpdateBodySchema` ainda é `{ name?, telephone? }` — `email` é descartado, logo o
 * `PUT /me` não altera o e-mail (CA2/CA3/CA4 reprovam). GREEN quando o W1 adicionar `email` ao schema +
 * ligá-lo no handler. CPF segue fora (decisão de produto: imutável no autosserviço).
 *
 * Driver memory. fastify.inject. ASCII puro.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { meUpdateBodySchema } from '#src/modules/auth/adapters/http/users-schemas.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  meHttpPlugin,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const SELF = 'self.profile@example.com';
const OTHER = 'other.profile@example.com';

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: SELF, password: STRONG, permissions: [] },
        { email: OTHER, password: STRONG, permissions: [] },
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

describe('USR-ME-PROFILE-FIELDS — schema (CA1/CA5)', () => {
  it('CA1: meUpdateBodySchema aceita email', () => {
    const parsed = meUpdateBodySchema.parse({ email: 'novo@example.com' });
    assert.equal(parsed.email, 'novo@example.com');
  });

  it('CA5: meUpdateBodySchema descarta cpf (imutável no autosserviço)', () => {
    const parsed = meUpdateBodySchema.parse({ cpf: '12345678901', name: 'X' }) as Record<
      string,
      unknown
    >;
    assert.equal(parsed['cpf'], undefined);
  });
});

describe('USR-ME-PROFILE-FIELDS — PUT /me (CA2/CA3/CA4)', () => {
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

  it('CA2: PUT /me altera email -> 200; GET /me reflete', async () => {
    const put = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${selfToken}` },
      payload: { email: 'self.novo@example.com' },
    });
    assert.equal(put.statusCode, 200);
    const get = await app.inject({
      method: 'GET',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${selfToken}` },
    });
    assert.equal((get.json() as { email: string }).email, 'self.novo@example.com');
  });

  it('CA3: PUT /me com email malformado -> 422', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${selfToken}` },
      payload: { email: 'nao-eh-email' },
    });
    assert.equal(res.statusCode, 422);
  });

  it('CA4: PUT /me com email de outro usuário -> 409', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/v1/me',
      headers: { authorization: `Bearer ${selfToken}` },
      payload: { email: OTHER },
    });
    assert.equal(res.statusCode, 409);
  });
});
