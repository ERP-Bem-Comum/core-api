/**
 * PAR-COLLABORATOR-HISTORY-EXPORT (US4). Captura (PUT gera histórico) + export CSV + 503.
 *
 * O history é um store ÚNICO (sem reader/writer split), então POST→PUT→GET export reflete a
 * captura no mesmo app (memory).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { err } from '#src/shared/index.ts';
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
const WRITER = 'rh.hist@example.com';

const PRE = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Diretor',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

type DepsOverride = (
  deps: Awaited<ReturnType<typeof buildPartnersHttpDeps>>,
) => Awaited<ReturnType<typeof buildPartnersHttpDeps>>;

const makeApp = async (override?: DepsOverride) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER,
          password: STRONG,
          permissions: [COLLABORATOR_PERMISSION.write, COLLABORATOR_PERMISSION.read],
        },
      ],
    },
  });
  const baseDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const partnersDeps = override ? override(baseDeps) : baseDeps;
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
    await baseDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('COLLABORATORS — histórico + export (US4)', () => {
  it('CA1+CA2: PUT muda Cargo → export?type=history traz a linha (Cargo;Diretor;Diretor Adjunto)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: PRE,
    });
    const id = (created.headers['location'] ?? '').slice('/api/v1/collaborators/'.length);

    const put = await app.inject({
      method: 'PUT',
      url: `/api/v1/collaborators/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...PRE, role: 'Diretor Adjunto' },
    });
    assert.equal(put.statusCode, 200);

    const exp = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}/export?type=history`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(exp.statusCode, 200);
    assert.equal(exp.headers['content-type'], 'text/csv; charset=utf-8');
    assert.ok(
      exp.body.includes('Cargo;Diretor;Diretor Adjunto;'),
      `linha de histórico ausente:\n${exp.body}`,
    );
    await teardown();
  });

  it('CA3: repositório de histórico indisponível → 503', async () => {
    const { app, teardown } = await makeApp((deps) => ({
      ...deps,
      listCollaboratorHistory: () => Promise.resolve(err('collaborator-repo-unavailable' as const)),
    }));
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/00000000-0000-4000-8000-000000000000/export?type=history',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 503);
    await teardown();
  });
});
