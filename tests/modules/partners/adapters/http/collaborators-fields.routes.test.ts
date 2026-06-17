/**
 * PAR-COLLABORATOR-PROFILE-FIELDS (US2). Campos de perfil na borda (complete-registration + detalhe).
 *
 * register/complete usam o MESMO writer (POST→PATCH no mesmo id sem seed). O detalhe (reader,
 * store distinto em memory) é verificado por um seed completo.
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
const WRITER = 'rh.fields@example.com';
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

const seedComplete = (): { id: string; record: CollaboratorReadRecord } => {
  const id = CollaboratorId.generate();
  const reg = Collaborator.register({
    id,
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(reg.ok, `register: ${reg.ok ? '' : reg.error}`);
  const done = Collaborator.completeRegistration(
    reg.value.collaborator,
    {
      rg: null,
      dateOfBirth: null,
      genderIdentity: null,
      race: null,
      education: null,
      foodCategory: null,
      foodCategoryDescription: null,
      completeAddress: null,
      telephone: null,
      emergencyContactName: null,
      emergencyContactTelephone: null,
      allergies: null,
      biography: null,
      experienceInThePublicSector: null,
      sex: 'F',
      maritalStatus: 'married',
      hasChildren: true,
      childrenCount: 2,
      childrenAges: [5, 8],
      isPwd: false,
      isOnLeave: null,
      leaveDuration: null,
      leaveRenewable: null,
      leaveRenewalDuration: null,
      publicSectorExperienceDuration: '4 anos',
    },
    NOW,
  );
  assert.ok(done.ok, `complete: ${done.ok ? '' : done.error}`);
  return {
    id: String(id),
    record: { collaborator: done.value.collaborator, legacyId: 21, createdAt: NOW, updatedAt: NOW },
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

const createPre = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/collaborators',
    headers: { authorization: `Bearer ${token}` },
    payload: PRE,
  });
  return (res.headers['location'] ?? '').slice('/api/v1/collaborators/'.length);
};

describe('COLLABORATORS — campos de perfil (US2)', () => {
  it('CA1: PATCH complete-registration com os campos → 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const id = await createPre(app, token);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: { sex: 'F', maritalStatus: 'single', hasChildren: false, childrenAges: [] },
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA1: GET detalhe (seed completo) retorna os campos de perfil', async () => {
    const { id, record } = seedComplete();
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(detail.statusCode, 200);
    const b = detail.json() as Record<string, unknown>;
    assert.equal(b.sex, 'F');
    assert.equal(b.maritalStatus, 'married');
    assert.deepEqual(b.childrenAges, [5, 8]);
    assert.equal(b.publicSectorExperienceDuration, '4 anos');
    await teardown();
  });

  it('CA2: sex fora de F|M → 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const id = await createPre(app, token);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: { sex: 'X' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA3: maritalStatus fora do enum → 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const id = await createPre(app, token);
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: { maritalStatus: 'complicated' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});
