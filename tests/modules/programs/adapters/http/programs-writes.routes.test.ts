/**
 * PROGRAMS-HTTP-WRITES (fatia 4) — W0 (RED) — POST /programs + PUT /programs/:id.
 *
 * DEVE FALHAR: a borda HTTP do módulo programs (public-api/http.ts, plugin, composition)
 * ainda não existe. GREEN quando o W1 entregar `programsHttpPlugin` + `buildProgramsHttpDeps`.
 *
 * Decisões herdadas (000-request fatia 4): escritas retornam o recurso no corpo (POST 201 +
 * Location + programa; PUT 200 + programa). Optimistic-lock (`version`) só no PUT.
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
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const VALID_BODY = {
  name: 'Escola Para a Vida',
  sigla: 'EPV',
  director: 'Vinícius Basílio',
  generalCharacteristics: 'Programa socioeducativo.',
  logoKey: null,
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [
            PROGRAM_PERMISSION.read,
            PROGRAM_PERMISSION.write,
            PROGRAM_PERMISSION.deactivate,
          ],
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
        plugin: programsHttpPlugin(programsDeps, {
          requireAuth,
          authorize: authDeps.authorize,
        }),
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

const create = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown> = VALID_BODY,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/programs',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });

describe('PROGRAMS-HTTP-WRITES — POST /programs', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/programs', payload: VALID_BODY });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem program:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await create(app, token)).statusCode, 403);
    await teardown();
  });

  it('CA: cria -> 201 + Location + corpo com o programa (status ATIVO, version 1)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token);
    assert.equal(res.statusCode, 201);
    const body = res.json() as Record<string, unknown>;
    assert.equal(typeof body['id'], 'string');
    assert.equal(body['name'], VALID_BODY.name);
    assert.equal(body['sigla'], 'EPV');
    assert.equal(body['status'], 'ATIVO');
    assert.equal(body['version'], 1);
    assert.equal(typeof body['programNumber'], 'number');
    assert.equal(res.headers['location'], `/api/v1/programs/${String(body['id'])}`);
    await teardown();
  });

  it('CA: sigla duplicada -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await create(app, token)).statusCode, 201);
    assert.equal((await create(app, token)).statusCode, 409);
    await teardown();
  });

  it('CA: nome inválido (<2) -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token, { ...VALID_BODY, name: 'A' });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA: sigla inválida -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token, { ...VALID_BODY, sigla: 'x!' });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

describe('PROGRAMS-HTTP-WRITES — PUT /programs/:id', () => {
  it('CA: edita com version correta -> 200 + corpo (version incrementada)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = ((await create(app, token)).json() as { id: string }).id;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/programs/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, director: 'Novo Diretor', version: 1 },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['director'], 'Novo Diretor');
    assert.equal(body['version'], 2);
    await teardown();
  });

  it('CA: version divergente -> 409 (version-conflict)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = ((await create(app, token)).json() as { id: string }).id;
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/programs/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, version: 99 },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/programs/${UUID_INEXISTENTE}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, version: 1 },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/programs/${UUID_INEXISTENTE}`,
      payload: { ...VALID_BODY, version: 1 },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});
