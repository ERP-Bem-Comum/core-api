/**
 * COLLABORATORS-HTTP-DETAIL (P1a) — W0 (RED) — GET /api/v1/collaborators/:id.
 *
 * DEVE FALHAR: `buildPartnersHttpDeps` ainda não aceita `seed` nem expõe
 * `getCollaboratorById`; a rota `/collaborators/:id` e o DTO de detalhe não existem.
 * GREEN quando o W1 entregar o read-model enriquecido (CollaboratorReader: agregado +
 * legacyId + createdAt/updatedAt), o seed em memory, a rota e o `collaboratorToDetailDto`
 * espelhando o schema legado `Collaborator` (handbook/legacy_docs/openapi.yaml:2435).
 *
 * Driver memory: o colaborador é semeado como read-record (agregado + meta de persistência).
 * Token via seed RBAC + login (espelha P0).
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
const NOPERM_EMAIL = 'sem.permissao@example.com';

const CREATED_AT = new Date('2026-01-10T08:00:00.000Z');
const UPDATED_AT = new Date('2026-02-20T09:30:00.000Z');

// Read-record semeado: agregado de domínio + metadados de persistência (legacyId/timestamps).
const seedRecord = () => {
  const id = CollaboratorId.generate();
  const r = Collaborator.register({
    id,
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-01-10T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: CREATED_AT,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return {
    id: String(id),
    record: {
      collaborator: r.value.collaborator,
      legacyId: 4242,
      createdAt: CREATED_AT,
      updatedAt: UPDATED_AT,
    },
  };
};

const makeApp = async (seedRecords: readonly CollaboratorReadRecord[]) => {
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
    seed: { collaborators: seedRecords },
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

const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

describe('COLLABORATORS-HTTP-DETAIL (P1a) — GET /api/v1/collaborators/:id', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { id, record } = seedRecord();
    const { app, teardown } = await makeApp([record]);
    const res = await app.inject({ method: 'GET', url: `/api/v1/collaborators/${id}` });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem collaborator:read -> 403', async () => {
    const { id, record } = seedRecord();
    const { app, teardown } = await makeApp([record]);
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400 (Zod, antes do domínio)', async () => {
    const { app, teardown } = await makeApp([]);
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/nao-e-uuid',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: UUID válido inexistente -> 404', async () => {
    const { app, teardown } = await makeApp([]);
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${UUID_INEXISTENTE}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('CA: existente -> 200 com DTO espelhando o schema legado Collaborator', async () => {
    const { id, record } = seedRecord();
    const { app, teardown } = await makeApp([record]);
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'], id); // UUID do core (decisão do dono)
    assert.equal(body['legacyId'], 4242);
    assert.equal(body['name'], 'Maria Silva');
    assert.equal(body['email'], 'maria@bemcomum.org');
    assert.equal(body['cpf'], '11144477735');
    assert.equal(body['occupationArea'], 'PARC');
    assert.equal(body['employmentRelationship'], 'CLT');
    // legado: `status` = registrationStatus; `active` = boolean separado.
    assert.equal(body['status'], 'PreRegistration');
    assert.equal(body['active'], true);
    assert.equal(body['disableBy'], null);
    assert.equal(body['createdAt'], CREATED_AT.toISOString());
    assert.equal(body['updatedAt'], UPDATED_AT.toISOString());
    await teardown();
  });
});

describe('COLLABORATORS-HTTP-DETAIL (P1a) — composition (seed + reader)', () => {
  it('CA: buildPartnersHttpDeps memory com seed expõe getCollaboratorById', async () => {
    const { id, record } = seedRecord();
    const deps = await buildPartnersHttpDeps({
      driver: 'memory',
      seed: { collaborators: [record] },
    });
    const found = await deps.getCollaboratorById(id);
    assert.equal(found.ok, true);
    assert.ok(found.value !== null);
    await deps.shutdown();
  });
});
