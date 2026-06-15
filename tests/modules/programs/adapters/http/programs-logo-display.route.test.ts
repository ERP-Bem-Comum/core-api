/**
 * W0 (RED) - GET /api/v1/programs/:id/logo (PRG-LOGO-CONTENT).
 *
 * DEVE FALHAR em W0 - a rota GET de bytes do logo nao existe (so POST /programs/:id/logo de upload).
 * Serve os bytes do logo, espelho do GET /me/photo e do documents/:id/content:
 * 200 com Content-Type real + bytes identicos ao upload; 404 sem logo (program-logo-not-found);
 * 404 programa inexistente; 403 sem program:read; 400 id malformado; 401 sem token.
 * Driver memory. fastify.inject. ASCII puro. Harness espelha programs-logo.routes.test.ts.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  programsHttpPlugin,
  buildProgramsHttpDeps,
} from '#src/modules/programs/public-api/http.ts';
import { PROGRAM_PERMISSION } from '#src/modules/programs/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'programs.reader@example.com';
const NOPERM_EMAIL = 'sem.permissao.display@example.com';

// PNG minimo: assinatura + corpo arbitrario.
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0xaa, 0xbb, 0xcc, 0xdd]);

type AppHandle = Awaited<ReturnType<typeof buildApp>>;

const makeApp = async (): Promise<{ app: AppHandle; teardown: () => Promise<void> }> => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: READER_EMAIL,
          password: STRONG,
          permissions: [PROGRAM_PERMISSION.read, PROGRAM_PERMISSION.write],
        },
        // Sem program:read (so write) -> 403 na leitura de bytes.
        { email: NOPERM_EMAIL, password: STRONG, permissions: [PROGRAM_PERMISSION.write] },
      ],
    },
  });
  const programsDeps = await buildProgramsHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: programsHttpPlugin(programsDeps, { requireAuth, authorize: authDeps.authorize }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await programsDeps.shutdown();
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

const createProgram = async (app: AppHandle, token: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/programs',
    headers: { authorization: `Bearer ${token}` },
    payload: {
      name: 'Escola Para a Vida',
      sigla: 'EPV',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
    },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { id: string }).id;
};

const putLogo = (app: AppHandle, token: string, id: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/programs/${id}/logo`,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' },
    payload: PNG,
  });

const getLogo = (app: AppHandle, token: string | null, id: string) =>
  app.inject({
    method: 'GET',
    url: `/api/v1/programs/${id}/logo`,
    headers: token !== null ? { authorization: `Bearer ${token}` } : {},
  });

describe('PRG-LOGO-CONTENT — GET /api/v1/programs/:id/logo', () => {
  it('CA1: programa com logo + program:read -> 200, bytes e Content-Type do upload', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const id = await createProgram(app, token);
    const up = await putLogo(app, token, id);
    assert.equal(up.statusCode, 200);

    const res = await getLogo(app, token, id);
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['content-type'], 'image/png');
    assert.deepEqual(res.rawPayload, PNG);
    await teardown();
  });

  it('CA1b: resposta nao e cacheavel (Cache-Control no-store — politica global /api/*)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const id = await createProgram(app, token);
    await putLogo(app, token, id);

    const res = await getLogo(app, token, id);
    assert.equal(res.statusCode, 200);
    // `no-store` vem do hook onSend global do buildApp (toda rota /api/*), nao do handler.
    const cache = res.headers['cache-control'] ?? '';
    assert.ok(cache.includes('no-store'), `cache-control sem no-store: "${cache}"`);
    await teardown();
  });

  it('CA2: programa sem logo -> 404 (front cai no placeholder)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const id = await createProgram(app, token);
    const res = await getLogo(app, token, id);
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA3: sem program:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const writer = await login(app, READER_EMAIL);
    const id = await createProgram(app, writer);
    await putLogo(app, writer, id);

    const noperm = await login(app, NOPERM_EMAIL);
    const res = await getLogo(app, noperm, id);
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA4: programa inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await getLogo(app, token, randomUUID());
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA5: id malformado -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await getLogo(app, token, 'nao-e-uuid');
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA6: sem token -> 401', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const id = await createProgram(app, token);
    const res = await getLogo(app, null, id);
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});
