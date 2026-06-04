/**
 * COLLABORATORS-HTTP-EDIT — W0 (RED) — PUT /api/v1/collaborators/:id com RBAC elevado.
 *
 * DEVE FALHAR: PUT, `editCollaborator` no composition, `hasPermission` no CollaboratorsHttpHooks e
 * `updateCollaboratorBodySchema` ainda não existem. GREEN no W1. Vital = cpf; email não-vital (único →
 * 409). PUT edita os 7 cadastrais (pessoais preservados). POST→PUT no mesmo writer (memory).
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
const DIRECTOR_EMAIL = 'rh.diretor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const CPF_A = '11144477735';
const CPF_B = '52998224725';

const body = (over: Record<string, unknown> = {}) => ({
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: CPF_A,
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
  ...over,
});

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.write] },
        {
          email: DIRECTOR_EMAIL,
          password: STRONG,
          permissions: [COLLABORATOR_PERMISSION.write, 'collaborator:edit-sensitive'],
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
        plugin: collaboratorsHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
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

const create = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  over: Record<string, unknown>,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/collaborators',
    headers: { authorization: `Bearer ${token}` },
    payload: body(over),
  });
  return (res.headers['location'] ?? '').slice('/api/v1/collaborators/'.length);
};

const put = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  payload: Record<string, unknown>,
) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/collaborators/${id}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

describe('COLLABORATORS-HTTP-EDIT — PUT /api/v1/collaborators/:id', () => {
  it('CA: sem Authorization -> 401; sem write -> 403', async () => {
    const { app, teardown } = await makeApp();
    assert.equal(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/collaborators/${UUID_INEXISTENTE}`,
          payload: body(),
        })
      ).statusCode,
      401,
    );
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400; inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await put(app, token, 'nao-uuid', body())).statusCode, 400);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 404);
    await teardown();
  });

  it('CA: write, sem mudar cpf (muda name) -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal(
      await put(app, token, id, body({ name: 'Maria S. Renomeada' })).then((r) => r.statusCode),
      200,
    );
    await teardown();
  });

  it('CA: write, mudando cpf -> 403 (sensitive-forbidden)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal(await put(app, token, id, body({ cpf: CPF_B })).then((r) => r.statusCode), 403);
    await teardown();
  });

  it('CA: director, mudando cpf -> 200; cpf novo já usado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, DIRECTOR_EMAIL);
    const id = await create(app, token, {});
    assert.equal(await put(app, token, id, body({ cpf: CPF_B })).then((r) => r.statusCode), 200);
    const other = await create(app, token, { email: 'outro@bemcomum.org', cpf: CPF_A });
    assert.equal(
      await put(app, token, other, body({ email: 'outro@bemcomum.org', cpf: CPF_B })).then(
        (r) => r.statusCode,
      ),
      409,
    );
    await teardown();
  });

  it('CA: write, email já usado por outro -> 409 (não-vital)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    await create(app, token, { email: 'ocupado@bemcomum.org', cpf: CPF_B });
    assert.equal(
      await put(app, token, id, body({ email: 'ocupado@bemcomum.org' })).then((r) => r.statusCode),
      409,
    );
    await teardown();
  });

  it('CA: name vazio -> 422; cpf curto -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, {});
    assert.equal(await put(app, token, id, body({ name: '   ' })).then((r) => r.statusCode), 422);
    assert.equal(await put(app, token, id, body({ cpf: '123' })).then((r) => r.statusCode), 400);
    await teardown();
  });
});
