/**
 * COLLABORATORS-HTTP-LIFECYCLE (P3) — W0 (RED) — deactivate + reactivate.
 *
 * DEVE FALHAR: as rotas POST /:id/deactivate e /:id/reactivate não existem; o composition
 * não expõe `deactivateCollaborator`/`reactivateCollaborator`. GREEN quando o W1 entregar
 * as duas rotas (writer pool) + body schema do `disableBy` + mapeamento erro→HTTP.
 *
 * Fluxo no mesmo writer repo: POST cadastro → deactivate → reactivate.
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
  return res.headers['location']!.slice('/api/v1/collaborators/'.length);
};

const deactivate = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  body: Record<string, unknown> = { disableBy: 'SOLICITACAO_RESCISAO_CONTRATUAL' },
) => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/collaborators/${id}/deactivate`,
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });
  return res;
};

const reactivate = async (app: Awaited<ReturnType<typeof buildApp>>, token: string, id: string) => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v1/collaborators/${id}/reactivate`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
  return res;
};

describe('COLLABORATORS-HTTP-LIFECYCLE (P3) — deactivate', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v1/collaborators/${UUID_INEXISTENTE}/deactivate`,
      payload: { disableBy: 'FALECIMENTO' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: sem collaborator:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await deactivate(app, token, UUID_INEXISTENTE);
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await deactivate(app, token, 'nao-uuid');
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: disableBy inválido -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const res = await deactivate(app, token, id, { disableBy: 'MOTIVO_INEXISTENTE' });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await deactivate(app, token, UUID_INEXISTENTE);
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA: ativo -> 200; segunda vez -> 409 (already-inactive)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    assert.equal((await deactivate(app, token, id)).statusCode, 200);
    assert.equal((await deactivate(app, token, id)).statusCode, 409);
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-LIFECYCLE (P3) — reactivate', () => {
  it('CA: inativo -> 200; ativo -> 409 (already-active)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    await deactivate(app, token, id);
    assert.equal((await reactivate(app, token, id)).statusCode, 200);
    assert.equal((await reactivate(app, token, id)).statusCode, 409);
    await teardown();
  });

  it('CA: id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await reactivate(app, token, UUID_INEXISTENTE);
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});
