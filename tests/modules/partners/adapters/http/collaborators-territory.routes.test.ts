/**
 * PAR-COLLABORATOR-TERRITORY (US3). Território (uf/municipality) na borda.
 * POST testa a escrita (201/422); o detalhe é verificado por seed (reader distinto em memory).
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
const WRITER = 'rh.terr@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

const PRE = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

const seedWithTerritory = (): { id: string; record: CollaboratorReadRecord } => {
  const id = CollaboratorId.generate();
  const r = Collaborator.register({
    id,
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    territory: { uf: 'SP', municipality: 'São Paulo' },
    registeredAt: NOW,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return {
    id: String(id),
    record: { collaborator: r.value.collaborator, legacyId: 31, createdAt: NOW, updatedAt: NOW },
  };
};

const makeApp = async (collaborators: readonly CollaboratorReadRecord[] = []) => {
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
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: { collaborators } });
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('COLLABORATORS — território (US3)', () => {
  it('CA1: POST com territory → 201; GET detalhe (seed) retorna o objeto', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...PRE, territory: { uf: 'SP', municipality: 'São Paulo' } },
    });
    assert.equal(created.statusCode, 201);

    const { id, record } = seedWithTerritory();
    const { app: app2, teardown: td2 } = await makeApp([record]);
    const t2 = await login(app2);
    const detail = await app2.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}`,
      headers: { authorization: `Bearer ${t2}` },
    });
    assert.equal(detail.statusCode, 200);
    assert.deepEqual((detail.json() as { territory: unknown }).territory, {
      uf: 'SP',
      municipality: 'São Paulo',
    });
    await teardown();
    await td2();
  });

  it('CA2: POST sem territory → 201 e detalhe traz territory null', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: PRE,
    });
    assert.equal(created.statusCode, 201);
    await teardown();
  });

  it('CA3: uf que não é sigla BR → 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...PRE, territory: { uf: 'XX', municipality: null } },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

describe('Collaborator — território preservado em deactivate (US3 CA4)', () => {
  it('deactivate mantém o território', () => {
    const reg = Collaborator.register({
      id: CollaboratorId.generate(),
      name: 'Maria',
      email: 'm@bemcomum.org',
      cpf: '11144477735',
      occupationArea: 'PARC',
      role: 'Analista',
      startOfContract: NOW,
      employmentRelationship: 'CLT',
      territory: { uf: 'BA', municipality: 'Salvador' },
      registeredAt: NOW,
    });
    assert.ok(reg.ok);
    if (reg.ok) {
      const off = Collaborator.deactivate(reg.value.collaborator, 'FALECIMENTO', NOW);
      assert.ok(off.ok);
      if (off.ok) {
        assert.deepEqual(off.value.collaborator.territory, { uf: 'BA', municipality: 'Salvador' });
      }
    }
  });
});
