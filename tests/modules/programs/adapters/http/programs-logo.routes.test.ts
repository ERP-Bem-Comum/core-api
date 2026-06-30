/**
 * PROGRAMS-HTTP-LOGO (fatia 4) — W0 (RED) — POST /programs/:id/logo (upload binário).
 *
 * DEVE FALHAR: a borda HTTP do módulo programs ainda não existe. GREEN no W1.
 *
 * Padrão do projeto: upload binário via content-type específico (image/png|jpeg|webp) com
 * `addContentTypeParser({ parseAs: 'buffer', bodyLimit })` — sem `@fastify/multipart`. Tipo
 * não suportado -> 415 (sem parser); payload > 5 MiB -> 413 (bodyLimit). Permissão `program:write`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

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
const WRITER_EMAIL = 'programs.editor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [PROGRAM_PERMISSION.read, PROGRAM_PERMISSION.write],
        },
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const registerAndLogin = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

const createOne = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
): Promise<string> => {
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
  return (res.json() as { id: string }).id;
};

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);

describe('PROGRAMS-HTTP-LOGO — POST /programs/:id/logo', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/programs/00000000-0000-4000-8000-000000000000/logo',
      headers: { 'content-type': 'image/png' },
      payload: PNG,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem program:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/programs/00000000-0000-4000-8000-000000000000/logo',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' },
      payload: PNG,
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: upload image/png -> 200 com logoKey', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/programs/${id}/logo`,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' },
      payload: PNG,
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { logoKey: string };
    assert.equal(typeof body.logoKey, 'string');
    assert.equal(body.logoKey.startsWith('programs/'), true);
    await teardown();
  });

  it('CA: tipo não suportado (application/pdf) -> 415', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/programs/${id}/logo`,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/pdf' },
      payload: Buffer.from('%PDF-1.4'),
    });
    assert.equal(res.statusCode, 415);
    await teardown();
  });

  it('CA: payload > 5 MiB -> 413', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/programs/${id}/logo`,
      headers: { authorization: `Bearer ${token}`, 'content-type': 'image/png' },
      payload: Buffer.alloc(6 * 1024 * 1024, 1),
    });
    assert.equal(res.statusCode, 413);
    await teardown();
  });
});
