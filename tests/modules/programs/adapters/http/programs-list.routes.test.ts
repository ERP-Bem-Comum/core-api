/**
 * PROGRAMS-HTTP-LIST (fatia 4) — W0 (RED) — GET /programs (paginado + busca) + GET /:id.
 *
 * DEVE FALHAR: a borda HTTP do módulo programs ainda não existe. GREEN no W1.
 *
 * Cobre FR-011 (lista vazia -> 200 com items:[] e meta coerente), paginação, busca por
 * substring (name OU sigla) e o detalhe por UUID (404 para inexistente).
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
const READER_EMAIL = 'programs.reader@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: READER_EMAIL,
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

const seedPrograms = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  programs: readonly Readonly<{ name: string; sigla: string }>[],
): Promise<void> => {
  for (const p of programs) {
    await app.inject({
      method: 'POST',
      url: '/api/v1/programs',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: p.name,
        sigla: p.sigla,
        director: null,
        generalCharacteristics: null,
        logoKey: null,
      },
    });
  }
};

describe('PROGRAMS-HTTP-LIST — GET /programs', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/programs' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem program:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/programs',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: lista vazia -> 200 com items:[] e meta coerente (FR-011)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/programs',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: unknown[]; meta: Record<string, number> };
    assert.deepEqual(body.items, []);
    assert.equal(body.meta['totalItems'], 0);
    assert.equal(body.meta['totalPages'], 0);
    assert.equal(body.meta['currentPage'], 1);
    await teardown();
  });

  it('CA: paginação -> page 1 limit 5 traz 5 de 7; totalPages 2', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    await seedPrograms(
      app,
      token,
      Array.from({ length: 7 }, (_v, i) => ({ name: `Programa ${i}`, sigla: `PRG${i}` })),
    );
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/programs?page=1&limit=5',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: unknown[]; meta: Record<string, number> };
    assert.equal(body.items.length, 5);
    assert.equal(body.meta['totalItems'], 7);
    assert.equal(body.meta['totalPages'], 2);
    await teardown();
  });

  it('CA: busca por substring (name OU sigla, case-insensitive)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    await seedPrograms(app, token, [
      { name: 'Escola Para a Vida', sigla: 'EPV' },
      { name: 'Banco de Alimentos', sigla: 'BAL' },
    ]);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/programs?search=escola',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: { sigla: string }[] };
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0]?.sigla, 'EPV');
    await teardown();
  });
});

describe('PROGRAMS-HTTP-LIST — GET /programs/:id', () => {
  it('CA: detalhe existente -> 200 com todos os campos', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/programs',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Escola Para a Vida',
        sigla: 'EPV',
        director: 'Diretor',
        generalCharacteristics: 'Desc',
        logoKey: null,
      },
    });
    const id = (created.json() as { id: string }).id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/programs/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'], id);
    assert.equal(body['sigla'], 'EPV');
    assert.equal(body['director'], 'Diretor');
    assert.equal(typeof body['version'], 'number');
    assert.equal(typeof body['createdAt'], 'string');
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/programs/${UUID_INEXISTENTE}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});
