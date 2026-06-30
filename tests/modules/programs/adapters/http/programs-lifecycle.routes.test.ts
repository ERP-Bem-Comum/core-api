/**
 * PROGRAMS-HTTP-LIFECYCLE (fatia 4) — W0 (RED) — POST /:id/deactivate + /:id/reactivate.
 *
 * DEVE FALHAR: a borda HTTP do módulo programs ainda não existe. GREEN no W1.
 *
 * Permissão `program:deactivate` (contrato). Sem `version` no corpo — guarda de estado
 * (`program-not-active`/`program-not-inactive`) serializa concorrência. Escritas retornam
 * o programa atualizado no corpo (status INATIVO/ATIVO).
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
const ADMIN_EMAIL = 'programs.admin@example.com';
const WRITER_ONLY_EMAIL = 'programs.writeronly@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: ADMIN_EMAIL,
          password: STRONG,
          permissions: [
            PROGRAM_PERMISSION.read,
            PROGRAM_PERMISSION.write,
            PROGRAM_PERMISSION.deactivate,
          ],
        },
        {
          email: WRITER_ONLY_EMAIL,
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

const deactivate = (app: Awaited<ReturnType<typeof buildApp>>, token: string, id: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/programs/${id}/deactivate`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });

const reactivate = (app: Awaited<ReturnType<typeof buildApp>>, token: string, id: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v1/programs/${id}/reactivate`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });

describe('PROGRAMS-HTTP-LIFECYCLE — deactivate', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/programs/${UUID_INEXISTENTE}/deactivate`,
      payload: {},
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem program:deactivate -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_ONLY_EMAIL);
    const id = await createOne(app, token);
    assert.equal((await deactivate(app, token, id)).statusCode, 403);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, ADMIN_EMAIL);
    assert.equal((await deactivate(app, token, UUID_INEXISTENTE)).statusCode, 404);
    await teardown();
  });

  it('CA: ativo -> 200 + corpo INATIVO; segunda vez -> 409 (not-active)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, ADMIN_EMAIL);
    const id = await createOne(app, token);
    const res = await deactivate(app, token, id);
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'INATIVO');
    assert.equal((await deactivate(app, token, id)).statusCode, 409);
    await teardown();
  });
});

describe('PROGRAMS-HTTP-LIFECYCLE — reactivate', () => {
  it('CA: inativo -> 200 + corpo ATIVO; ativo -> 409 (not-inactive)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, ADMIN_EMAIL);
    const id = await createOne(app, token);
    await deactivate(app, token, id);
    const res = await reactivate(app, token, id);
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { status: string }).status, 'ATIVO');
    assert.equal((await reactivate(app, token, id)).statusCode, 409);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, ADMIN_EMAIL);
    assert.equal((await reactivate(app, token, UUID_INEXISTENTE)).statusCode, 404);
    await teardown();
  });
});
