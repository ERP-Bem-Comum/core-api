/**
 * COLLABORATORS-HTTP-REGISTER (P2) — W0 (RED) — POST cadastro + PATCH complete-registration.
 *
 * DEVE FALHAR: as rotas de escrita não existem; o composition não expõe
 * `registerCollaborator`/`completeCollaboratorRegistration` nem o writer repo. GREEN quando
 * o W1 entregar: writer pool, POST /collaborators (201 + Location) e
 * PATCH /:id/complete-registration (200), com mapeamento erro→HTTP.
 *
 * Driver memory: register/complete usam o MESMO writer repo, então POST→PATCH no mesmo id
 * funciona sem seed.
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
  collaboratorsHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { COLLABORATOR_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'rh.editor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';

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
        { email: WRITER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.write] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: collaboratorsHttpPlugin(partnersDeps, {
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

describe('COLLABORATORS-HTTP-REGISTER (P2) — POST /api/v1/collaborators', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem collaborator:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: body válido -> 201 + Location /api/v1/collaborators/{uuid}', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 201);
    const location = res.headers['location'];
    assert.ok(typeof location === 'string' && location.startsWith('/api/v1/collaborators/'));
    await teardown();
  });

  it('CA: CPF duplicado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const hdr = { authorization: `Bearer ${token}` };
    await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: hdr,
      payload: VALID_BODY,
    });
    const dup = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: hdr,
      payload: { ...VALID_BODY, email: 'outro@bemcomum.org' },
    });
    assert.equal(dup.statusCode, 409);
    await teardown();
  });

  it('CA: body fora do shape (cpf curto) -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, cpf: '123' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: CPF com DV inválido (11 dígitos) -> 422 (domínio)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, cpf: '11111111111' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-REGISTER (P2) — PATCH /:id/complete-registration', () => {
  const createOne = async (
    app: Awaited<ReturnType<typeof buildApp>>,
    token: string,
  ): Promise<string> => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: VALID_BODY,
    });
    const location = res.headers['location']!;
    return location.slice('/api/v1/collaborators/'.length);
  };

  it('CA: sem collaborator:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/collaborators/00000000-0000-4000-8000-000000000000/complete-registration',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/collaborators/nao-uuid/complete-registration',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'PATCH',
      url: '/api/v1/collaborators/00000000-0000-4000-8000-000000000000/complete-registration',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA: pré-cadastro -> 200; segunda vez -> 409 (already-complete)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const hdr = { authorization: `Bearer ${token}` };
    const first = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: hdr,
      payload: { genderIdentity: 'MULHER_CIS' },
    });
    assert.equal(first.statusCode, 200);
    const second = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: hdr,
      payload: {},
    });
    assert.equal(second.statusCode, 409);
    await teardown();
  });
});
