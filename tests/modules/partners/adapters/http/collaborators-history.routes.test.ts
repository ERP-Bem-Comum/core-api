/**
 * #44 — W0/W1 — rotas de histórico: GET /collaborators/:id/history + GET /export?type=history.
 *
 * CA2: export?type=history → 200 text/csv, header legado; export cadastral sem regressão.
 * CA3: history reader indisponível → 503 collaborator-repo-unavailable.
 * CA4: GET /:id/history → 200 lista DESC; sem histórico → []; não-UUID → 400; sem auth → 401/403.
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
  role: 'Diretor',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

const makeApp = async (overrideDeps?: Awaited<ReturnType<typeof buildPartnersHttpDeps>>) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          // Histórico/export exigem collaborator:read; criar/editar exigem collaborator:write.
          permissions: [COLLABORATOR_PERMISSION.read, COLLABORATOR_PERMISSION.write],
        },
      ],
    },
  });
  const partnersDeps = overrideDeps ?? (await buildPartnersHttpDeps({ driver: 'memory' }));
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

const edit = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  over: Record<string, unknown>,
) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/collaborators/${id}`,
    headers: { authorization: `Bearer ${token}` },
    payload: { ...VALID_BODY, ...over },
  });

describe('#44 GET /collaborators/:id/history', () => {
  it('CA4: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${UUID_INEXISTENTE}/history`,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA4: sem collaborator:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${UUID_INEXISTENTE}/history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA4: :id não-UUID -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/nao-uuid/history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA4: sem histórico -> 200 lista vazia', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}/history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: unknown[] };
    assert.equal(body.items.length, 0);
    await teardown();
  });

  it('CA4: 2 edições -> 200 com 2 entries DESC', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    assert.equal((await edit(app, token, id, { role: 'Diretor Adjunto' })).statusCode, 200);
    assert.equal((await edit(app, token, id, { role: 'Coordenador' })).statusCode, 200);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}/history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: { changeType: string; after: string }[] };
    assert.equal(body.items.length, 2);
    assert.equal(body.items[0]?.changeType, 'Edicao');
    await teardown();
  });
});

describe('#44 GET /collaborators/export?type=history', () => {
  it('CA2: >=1 alteração -> 200 text/csv com header legado', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await createOne(app, token);
    await edit(app, token, id, { role: 'Diretor Adjunto' });
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/export?type=history',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(String(res.headers['content-type']).includes('text/csv'));
    assert.ok(res.body.includes('tipo_alteracao;antes;depois;data'));
    await teardown();
  });

  it('CA2: export cadastral (sem type) permanece inalterado (header cadastral)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    await createOne(app, token);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/export',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes('id,name,email,cpf'));
    assert.ok(!res.body.includes('tipo_alteracao;antes;depois;data'));
    await teardown();
  });
});

describe('#44 CA3 — history reader indisponível -> 503', () => {
  it('GET /:id/history -> 503 collaborator-repo-unavailable', async () => {
    const base = await buildPartnersHttpDeps({ driver: 'memory' });
    const broken = {
      ...base,
      listCollaboratorHistory: () =>
        Promise.resolve({
          ok: false as const,
          error: 'collaborator-repo-unavailable' as const,
        }),
    };
    const { app, teardown } = await makeApp(broken as unknown as typeof base);
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${UUID_INEXISTENTE}/history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 503);
    assert.equal(
      (res.json() as { error: { code: string } }).error.code,
      'collaborator-repo-unavailable',
    );
    await teardown();
  });
});
