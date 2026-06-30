/**
 * COLLABORATORS-HTTP-LIST (P1b) — W0 (RED) — GET /api/v1/collaborators paginado + filtros.
 *
 * DEVE FALHAR: a rota de lista ainda usa o shape mínimo da P0 (`meta.total`, item enxuto,
 * sobre o repo vazio) e `listCollaboratorRecords` não existe. GREEN quando o W1 alinhar a
 * lista ao legado: item = DTO `Collaborator` completo (reusa `collaboratorToDetailDto`),
 * `meta { itemCount,totalItems,itemsPerPage,totalPages,currentPage }`, lendo do reader
 * semeado, com os 5 filtros (reusa `collaboratorMatchesFilter`) + paginação.
 *
 * Driver memory: colaboradores semeados como read-records (agregado + legacyId/timestamps).
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
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'rh.leitor@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

const mkActive = (name: string, cpf: string, occupationArea: string) => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name,
    email: `${name.toLowerCase()}@bemcomum.org`,
    cpf,
    occupationArea,
    role: 'Analista',
    startOfContract: new Date('2026-01-10T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const recordOf = (collaborator: CollaboratorEntity, legacyId: number): CollaboratorReadRecord => ({
  collaborator,
  legacyId,
  createdAt: NOW,
  updatedAt: NOW,
});

// 2 ativos (PARC, DDI) + 1 inativo (PARC). CPFs válidos distintos.
const seedRecords = (): readonly CollaboratorReadRecord[] => {
  const ana = mkActive('Ana', '11144477735', 'PARC');
  const bruno = mkActive('Bruno', '52998224725', 'DDI');
  const carlaActive = mkActive('Carla', '39053344705', 'PARC');
  const deact = Collaborator.deactivate(carlaActive, 'SOLICITACAO_RESCISAO_CONTRATUAL', NOW);
  assert.ok(deact.ok, `fixture deactivate: ${deact.ok ? '' : deact.error}`);
  return [recordOf(ana, 1), recordOf(bruno, 2), recordOf(deact.value.collaborator, 3)];
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
    payload: { email: READER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

interface Meta {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}
interface Body {
  items: readonly Record<string, unknown>[];
  meta: Meta;
}

const get = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  query: string,
): Promise<Body> => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/collaborators${query}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return res.json() as Body;
};

describe('COLLABORATORS-HTTP-LIST (P1b) — GET /api/v1/collaborators', () => {
  it('CA: 200 com meta legado e items = DTO Collaborator completo', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app);
    const body = await get(app, token, '');
    assert.equal(body.meta.totalItems, 3);
    assert.equal(body.meta.currentPage, 1);
    assert.equal(body.meta.itemsPerPage, 5);
    assert.equal(body.meta.totalPages, 1);
    assert.equal(body.meta.itemCount, 3);
    const first = body.items[0]!;
    assert.ok('legacyId' in first);
    assert.ok('active' in first);
    assert.ok('createdAt' in first);
    await teardown();
  });

  it('CA: filtro search=Ana -> 1', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app);
    const body = await get(app, token, '?search=Ana');
    assert.equal(body.meta.totalItems, 1);
    await teardown();
  });

  it('CA: filtro occupationAreas=PARC -> 2 (Ana, Carla)', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app);
    const body = await get(app, token, '?occupationAreas=PARC');
    assert.equal(body.meta.totalItems, 2);
    await teardown();
  });

  it('CA: filtro active=1 -> 2; active=0 -> 1', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app);
    const ativos = await get(app, token, '?active=1');
    assert.equal(ativos.meta.totalItems, 2);
    const inativos = await get(app, token, '?active=0');
    assert.equal(inativos.meta.totalItems, 1);
    await teardown();
  });

  it('CA: paginação limit=2&page=1 -> 2 items, totalPages=2, totalItems=3', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app);
    const body = await get(app, token, '?limit=2&page=1');
    assert.equal(body.items.length, 2);
    assert.equal(body.meta.itemCount, 2);
    assert.equal(body.meta.totalItems, 3);
    assert.equal(body.meta.totalPages, 2);
    assert.equal(body.meta.currentPage, 1);
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-LIST (P1b) — composition', () => {
  it('CA: buildPartnersHttpDeps expõe listCollaboratorRecords', async () => {
    const deps = await buildPartnersHttpDeps({
      driver: 'memory',
      seed: { collaborators: seedRecords() },
    });
    const r = await deps.listCollaboratorRecords();
    assert.equal(r.ok, true);
    await deps.shutdown();
  });
});
