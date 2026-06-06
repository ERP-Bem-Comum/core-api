/**
 * ACTS-HTTP — Testes de rotas HTTP do recurso Act (espelha collaborators-register.routes.test.ts).
 *
 * Cobre: autenticação (401), autorização (403), validação Zod (400), invariante domínio (422),
 * duplicidade (409), CRUD completo (POST 201+Location / GET lista / GET:id / PUT / deactivate /
 * reactivate) e soft-delete.
 *
 * Driver memory — sem MySQL.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import { actHttpPlugin, buildPartnersHttpDeps } from '#src/modules/partners/public-api/http.ts';
import { ACT_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'act.reader@example.com';
const WRITER_EMAIL = 'act.writer@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const VALID_BODY = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [ACT_PERMISSION.read] },
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [ACT_PERMISSION.read, ACT_PERMISSION.write],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: actHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
        }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
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

/** POST /api/v1/acts e retorna o UUID criado via Location header. */
const createOne = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body = VALID_BODY,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/acts',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });
  if (res.statusCode !== 201) throw new Error(`createOne falhou: ${res.statusCode} ${res.body}`);
  return res.headers['location']!.slice('/api/v1/acts/'.length);
};

// ─── POST /acts ───────────────────────────────────────────────────────────────

describe('ACTS-HTTP — POST /api/v1/acts', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'POST', url: '/api/v1/acts', payload: VALID_BODY });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('autenticado sem act:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('body válido -> 201 + Location /api/v1/acts/{uuid}', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 201);
    const location = res.headers['location'];
    assert.ok(typeof location === 'string' && location.startsWith('/api/v1/acts/'));
    await teardown();
  });

  it('CPF duplicado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const hdr = { authorization: `Bearer ${token}` };
    await app.inject({ method: 'POST', url: '/api/v1/acts', headers: hdr, payload: VALID_BODY });
    const dup = await app.inject({
      method: 'POST',
      url: '/api/v1/acts',
      headers: hdr,
      payload: { ...VALID_BODY, email: 'outro@bemcomum.org' },
    });
    assert.equal(dup.statusCode, 409);
    await teardown();
  });

  it('body fora do shape (cpf curto) -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, cpf: '123' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CPF com DV inválido (11 dígitos) -> 422 (domínio)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, cpf: '11111111111' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

// ─── GET /acts ────────────────────────────────────────────────────────────────

describe('ACTS-HTTP — GET /api/v1/acts', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/acts' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem act:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('lista vazia -> 200 com items=[] e meta', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: unknown[]; meta: { totalItems: number } };
    assert.equal(Array.isArray(body.items), true);
    assert.equal(body.meta.totalItems, 0);
    await teardown();
  });

  it('após cadastro, lista retorna o act', async () => {
    const { app, teardown } = await makeApp();
    const wToken = await login(app, WRITER_EMAIL);
    await createOne(app, wToken);
    const rToken = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/acts',
      headers: { authorization: `Bearer ${rToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: unknown[]; meta: { totalItems: number } };
    assert.equal(body.meta.totalItems, 1);
    await teardown();
  });
});

// ─── GET /acts/:id ────────────────────────────────────────────────────────────

describe('ACTS-HTTP — GET /api/v1/acts/:id', () => {
  it(':id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/acts/nao-uuid',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/acts/${UUID_INEXISTENTE}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('id existente -> 200 com shape correto', async () => {
    const { app, teardown } = await makeApp();
    const wToken = await login(app, WRITER_EMAIL);
    const id = await createOne(app, wToken);
    const rToken = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/acts/${id}`,
      headers: { authorization: `Bearer ${rToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'], id);
    assert.equal(body['active'], true);
    assert.equal(typeof body['name'], 'string');
    assert.equal(typeof body['cpf'], 'string');
    await teardown();
  });
});

// ─── PUT /acts/:id ────────────────────────────────────────────────────────────

describe('ACTS-HTTP — PUT /api/v1/acts/:id', () => {
  it('sem act:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const wToken = await login(app, WRITER_EMAIL);
    const id = await createOne(app, wToken);
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/acts/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/acts/${UUID_INEXISTENTE}`,
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('edição válida -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/acts/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, name: 'Maria Souza' },
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });
});

// ─── Deactivate / Reactivate ─────────────────────────────────────────────────

describe('ACTS-HTTP — POST /api/v1/acts/:id/deactivate', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/acts/${UUID_INEXISTENTE}/deactivate`,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem act:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/acts/${UUID_INEXISTENTE}/deactivate`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it(':id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/acts/nao-uuid/deactivate',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/acts/${UUID_INEXISTENTE}/deactivate`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('ativo -> 200; segunda vez -> 409 (already-inactive)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const hdr = { authorization: `Bearer ${token}` };
    assert.equal(
      (await app.inject({ method: 'POST', url: `/api/v1/acts/${id}/deactivate`, headers: hdr }))
        .statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ method: 'POST', url: `/api/v1/acts/${id}/deactivate`, headers: hdr }))
        .statusCode,
      409,
    );
    await teardown();
  });
});

describe('ACTS-HTTP — POST /api/v1/acts/:id/reactivate', () => {
  it('inativo -> 200; ativo -> 409 (already-active)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const hdr = { authorization: `Bearer ${token}` };
    await app.inject({ method: 'POST', url: `/api/v1/acts/${id}/deactivate`, headers: hdr });
    assert.equal(
      (await app.inject({ method: 'POST', url: `/api/v1/acts/${id}/reactivate`, headers: hdr }))
        .statusCode,
      200,
    );
    assert.equal(
      (await app.inject({ method: 'POST', url: `/api/v1/acts/${id}/reactivate`, headers: hdr }))
        .statusCode,
      409,
    );
    await teardown();
  });

  it('id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/acts/${UUID_INEXISTENTE}/reactivate`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});
