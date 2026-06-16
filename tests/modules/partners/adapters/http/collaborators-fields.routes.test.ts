/**
 * PAR-COLLABORATOR-FIELDS — W0 (RED) → W1 (GREEN) — borda HTTP dos campos novos.
 * Cobre: #41 CA1/CA3/CA4, #42 CA1/CA2/CA3, #40 CA2 via fastify.inject (driver memory).
 *
 * Arquitetura (driver memory): writer e reader são stores SEPARADOS (composition.ts) — o POST
 * grava no writer; o detalhe lê do reader semeável. Por isso:
 *  - WRITE (POST/PATCH): asserta 201/200 + validação (422 com slug do domínio).
 *  - READ (detalhe): semeia um read-record com os campos e asserta a serialização do DTO.
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
const USER_EMAIL = 'rh.editor@example.com';

const BASE_BODY = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

const makeApp = async (seedRecords: readonly CollaboratorReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: USER_EMAIL,
          password: STRONG,
          permissions: [COLLABORATOR_PERMISSION.write, COLLABORATOR_PERMISSION.read],
        },
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
    payload: { email: USER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

// Read-record completo (Complete) carregando os campos novos — para a serialização do detalhe.
const seededComplete = () => {
  const id = CollaboratorId.generate();
  const reg = Collaborator.register({
    id,
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-01-10T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: new Date('2026-01-10T08:00:00.000Z'),
  });
  assert.ok(reg.ok);
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
      childrenAges: '5,8',
      isPwd: true,
      pwdDescription: 'baixa visão',
      isOnLeave: false,
      leaveDuration: null,
      leaveRenewable: null,
      leaveRenewalDuration: null,
      publicSectorExperienceDuration: '3 anos',
      territory: { uf: 'SP', municipality: 'São Paulo' },
      bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
      pixKey: { keyType: 'email', key: 'maria@bemcomum.org' },
    },
    new Date('2026-02-20T09:30:00.000Z'),
  );
  assert.ok(done.ok, `fixture complete: ${done.ok ? '' : done.error}`);
  return {
    id: String(id),
    record: {
      collaborator: done.value.collaborator,
      legacyId: null,
      createdAt: new Date('2026-01-10T08:00:00.000Z'),
      updatedAt: new Date('2026-02-20T09:30:00.000Z'),
    } satisfies CollaboratorReadRecord,
  };
};

const post = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown>,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/collaborators',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });

describe('PAR-COLLABORATOR-FIELDS — escrita aceita TERRITÓRIO + BANCÁRIO no POST', () => {
  it('#42 CA1 / #40 CA2: POST com territory + bankAccount/pixKey válidos → 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await post(app, token, {
      ...BASE_BODY,
      territory: { uf: 'SP', municipality: 'São Paulo' },
      bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
      pixKey: { keyType: 'email', key: 'maria@bemcomum.org' },
    });
    assert.equal(res.statusCode, 201);
    await teardown();
  });

  it('#42 CA2: POST sem territory/banco → 201 (backward-compatible)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await post(app, token, { ...BASE_BODY });
    assert.equal(res.statusCode, 201);
    await teardown();
  });

  it('#42 CA3: POST com uf inválida → 422 territory-uf-invalid', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await post(app, token, {
      ...BASE_BODY,
      territory: { uf: 'XX', municipality: 'Cidade' },
    });
    assert.equal(res.statusCode, 422);
    assert.equal((res.json() as { error: { code: string } }).error.code, 'territory-uf-invalid');
    await teardown();
  });

  it('#40 CA3: POST com agência inválida → 422 bank-agency-invalid', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await post(app, token, {
      ...BASE_BODY,
      bankAccount: { bank: '001', agency: '1', accountNumber: '123', checkDigit: '0' },
    });
    assert.equal(res.statusCode, 422);
    assert.equal((res.json() as { error: { code: string } }).error.code, 'bank-agency-invalid');
    await teardown();
  });
});

describe('PAR-COLLABORATOR-FIELDS — complete-registration valida PERFIL', () => {
  it('#41 CA3: maritalStatus fora do enum → 422 marital-status-invalid', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    // POST→PATCH no mesmo writer (driver memory) — register/complete compartilham o writer repo.
    const created = await post(app, token, { ...BASE_BODY });
    const id = String(created.headers['location']).slice('/api/v1/collaborators/'.length);
    const bad = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: { maritalStatus: 'engaged' },
    });
    assert.equal(bad.statusCode, 422);
    assert.equal((bad.json() as { error: { code: string } }).error.code, 'marital-status-invalid');
    await teardown();
  });

  it('#41 CA2: sex fora de F|M → 422 sex-invalid', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await post(app, token, { ...BASE_BODY });
    const id = String(created.headers['location']).slice('/api/v1/collaborators/'.length);
    const bad = await app.inject({
      method: 'PATCH',
      url: `/api/v1/collaborators/${id}/complete-registration`,
      headers: { authorization: `Bearer ${token}` },
      payload: { sex: 'X' },
    });
    assert.equal(bad.statusCode, 422);
    assert.equal((bad.json() as { error: { code: string } }).error.code, 'sex-invalid');
    await teardown();
  });
});

describe('PAR-COLLABORATOR-FIELDS — detalhe serializa os campos novos', () => {
  it('#41 CA1 / #42 CA1 / #40 CA2: GET detalhe retorna PERFIL + território + banco/pix', async () => {
    const { id, record } = seededComplete();
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const det = (
      await app.inject({
        method: 'GET',
        url: `/api/v1/collaborators/${id}`,
        headers: { authorization: `Bearer ${token}` },
      })
    ).json() as Record<string, unknown>;
    assert.equal(det['status'], 'Complete');
    assert.equal(det['sex'], 'F');
    assert.equal(det['maritalStatus'], 'married');
    assert.equal(det['hasChildren'], true);
    assert.equal(det['childrenCount'], 2);
    assert.equal(det['isPwd'], true);
    assert.equal(det['pwdDescription'], 'baixa visão');
    assert.equal(det['publicSectorExperienceDuration'], '3 anos');
    assert.deepEqual(det['territory'], { uf: 'SP', municipality: 'São Paulo' });
    assert.deepEqual(det['bankAccount'], {
      bank: '001',
      agency: '0001-2',
      accountNumber: '123456',
      checkDigit: '7',
    });
    assert.deepEqual(det['pixKey'], { keyType: 'email', key: 'maria@bemcomum.org' });
    await teardown();
  });

  it('#42 CA2 / #41 CA4: colaborador legado (PreRegistration) → campos novos null explícitos', async () => {
    const id = CollaboratorId.generate();
    const reg = Collaborator.register({
      id,
      name: 'João',
      email: 'joao@bemcomum.org',
      cpf: '11144477735',
      occupationArea: 'PARC',
      role: 'Analista',
      startOfContract: new Date('2026-01-10T00:00:00.000Z'),
      employmentRelationship: 'CLT',
      registeredAt: new Date('2026-01-10T08:00:00.000Z'),
    });
    assert.ok(reg.ok);
    const record: CollaboratorReadRecord = {
      collaborator: reg.value.collaborator,
      legacyId: 7,
      createdAt: new Date('2026-01-10T08:00:00.000Z'),
      updatedAt: new Date('2026-01-10T08:00:00.000Z'),
    };
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const det = (
      await app.inject({
        method: 'GET',
        url: `/api/v1/collaborators/${String(id)}`,
        headers: { authorization: `Bearer ${token}` },
      })
    ).json() as Record<string, unknown>;
    for (const k of [
      'sex',
      'maritalStatus',
      'hasChildren',
      'childrenCount',
      'isPwd',
      'isOnLeave',
      'publicSectorExperienceDuration',
      'territory',
      'bankAccount',
      'pixKey',
    ]) {
      assert.ok(k in det, `campo ${k} deve estar presente no detalhe`);
      assert.equal(det[k], null, `campo ${k} deve ser null`);
    }
    await teardown();
  });
});
