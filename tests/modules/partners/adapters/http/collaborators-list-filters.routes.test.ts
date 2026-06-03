/**
 * COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c) — W0 (RED) — filtros novos via rota.
 *
 * DEVE FALHAR: `collaboratorListQuerySchema` ainda não conhece `roles`/`yearOfContract`
 * (Zod faz strip dos params desconhecidos), então o filtro não restringe e a contagem
 * diverge. GREEN quando o W1 adicionar os params + o mapeamento em queryToFilter.
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
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'rh.leitor@example.com';
const NOW = new Date('2026-06-01T12:00:00.000Z');

const recordOf = (cpf: string, role: string, year: number): CollaboratorReadRecord => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: role,
    email: `${cpf}@bemcomum.org`,
    cpf,
    occupationArea: 'PARC',
    role,
    startOfContract: new Date(`${year}-03-01T00:00:00.000Z`),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return { collaborator: r.value.collaborator, legacyId: null, createdAt: NOW, updatedAt: NOW };
};

const makeApp = async (records: readonly CollaboratorReadRecord[]) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.read] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: { collaborators: records },
  });
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

const totalItems = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  query: string,
): Promise<number> => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/collaborators${query}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return (res.json() as { meta: { totalItems: number } }).meta.totalItems;
};

const seed = (): readonly CollaboratorReadRecord[] => [
  recordOf('11144477735', 'Analista', 2026),
  recordOf('52998224725', 'Gestor', 2025),
];

describe('COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c) — rota', () => {
  it('CA: ?roles=Analista -> 1', async () => {
    const { app, teardown } = await makeApp(seed());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: READER_EMAIL, password: STRONG },
    });
    const token = (res.json() as { accessToken: string }).accessToken;
    assert.equal(await totalItems(app, token, '?roles=Analista'), 1);
    await teardown();
  });

  it('CA: ?yearOfContract=2025 -> 1', async () => {
    const { app, teardown } = await makeApp(seed());
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: READER_EMAIL, password: STRONG },
    });
    const token = (res.json() as { accessToken: string }).accessToken;
    assert.equal(await totalItems(app, token, '?yearOfContract=2025'), 1);
    await teardown();
  });
});
