/**
 * PAR-COLLABORATOR-SELF-REGISTER — W0 (RED) — rota pública de autocadastro (#43, CA1-CA6).
 *
 * Fluxo: operador autenticado dispara POST /:id/activate/request (gera token + e-mail);
 * o link tokenizado é capturado pelo mailer InMemory injetado no composition; depois as
 * rotas PÚBLICAS (sem requireAuth) GET /collaborators/autocadastro?token= (preview com CPF
 * mascarado) e POST /collaborators/autocadastro { token, cpfPrefix, ...pessoais } (conclui).
 * DEVE FALHAR: rotas inexistentes + composition sem o mailer injetável.
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
import { makeInMemoryCollaboratorActivationMailer } from '#src/modules/partners/adapters/notifications/collaborator-activation-mailer.in-memory.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'rh.editor@example.com';

const VALID_BODY = {
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735', // prefixo 111
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: '2026-01-10',
  employmentRelationship: 'CLT',
};

const EMPTY_PERSONAL = {
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
};

const makeApp = async () => {
  const activationMailer = makeInMemoryCollaboratorActivationMailer();
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [COLLABORATOR_PERMISSION.write] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    activationMailer,
    activationBaseUrl: 'http://localhost:3000/collaborators/autocadastro',
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
  return { app, teardown, activationMailer };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const createAndRequest = async (app: Awaited<ReturnType<typeof buildApp>>, token: string) => {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v1/collaborators',
    headers: { authorization: `Bearer ${token}` },
    payload: VALID_BODY,
  });
  const id = created.headers['location']!.slice('/api/v1/collaborators/'.length);
  const requested = await app.inject({
    method: 'POST',
    url: `/api/v1/collaborators/${id}/activate/request`,
    headers: { authorization: `Bearer ${token}` },
    payload: {},
  });
  return { id, requested };
};

const tokenFromLink = (url: string): string => new URL(url).searchParams.get('token')!;

describe('autocadastro — CA1 (request gera token + e-mail)', () => {
  it('operador autenticado dispara request -> 202 e 1 link tokenizado', async () => {
    const { app, teardown, activationMailer } = await makeApp();
    const access = await login(app, WRITER_EMAIL);
    const { requested } = await createAndRequest(app, access);
    assert.ok(requested.statusCode === 202 || requested.statusCode === 200);
    assert.equal(activationMailer.sentLinks.length, 1);
    await teardown();
  });

  it('request sem Authorization -> 401 (rota de request é autenticada)', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/00000000-0000-4000-8000-000000000000/activate/request',
      payload: {},
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});

describe('autocadastro — CA2 (preview público com CPF mascarado)', () => {
  it('GET sem auth com token válido -> 200 e CPF mascarado (sem CPF completo)', async () => {
    const { app, teardown, activationMailer } = await makeApp();
    const access = await login(app, WRITER_EMAIL);
    await createAndRequest(app, access);
    const token = tokenFromLink(activationMailer.sentLinks[0]!.activationUrl);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/autocadastro?token=${encodeURIComponent(token)}`,
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    const serialized = JSON.stringify(body);
    assert.ok(!serialized.includes('11144477735'), 'CPF completo não pode vazar');
    assert.ok('cpfMasked' in body);
    await teardown();
  });
});

describe('autocadastro — CA3 (token expirado/usado/inexistente -> 404 slug, sem vazar dados)', () => {
  it('GET com token inexistente -> 404 slug token-invalid', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/autocadastro?token=inexistente',
    });
    assert.equal(res.statusCode, 404);
    const serialized = JSON.stringify(res.json());
    assert.ok(serialized.includes('collaborator-autocadastro-token-invalid'));
    await teardown();
  });

  it('GET com token já usado -> 404 slug token-used', async () => {
    const { app, teardown, activationMailer } = await makeApp();
    const access = await login(app, WRITER_EMAIL);
    await createAndRequest(app, access);
    const token = tokenFromLink(activationMailer.sentLinks[0]!.activationUrl);

    // consome via POST conclusão
    await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '111', ...EMPTY_PERSONAL },
    });
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/collaborators/autocadastro?token=${encodeURIComponent(token)}`,
    });
    assert.equal(res.statusCode, 404);
    assert.ok(JSON.stringify(res.json()).includes('collaborator-autocadastro-token-used'));
    await teardown();
  });
});

describe('autocadastro — CA4 (conclusão + invalidação)', () => {
  it('POST sem auth com token+cpfPrefix -> 200 Complete; 2º POST -> 404 token-used', async () => {
    const { app, teardown, activationMailer } = await makeApp();
    const access = await login(app, WRITER_EMAIL);
    await createAndRequest(app, access);
    const token = tokenFromLink(activationMailer.sentLinks[0]!.activationUrl);

    const first = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '111', ...EMPTY_PERSONAL },
    });
    assert.equal(first.statusCode, 200);

    const second = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '111', ...EMPTY_PERSONAL },
    });
    assert.equal(second.statusCode, 404);
    assert.ok(JSON.stringify(second.json()).includes('collaborator-autocadastro-token-used'));
    await teardown();
  });
});

describe('autocadastro — CA5 (cpf mismatch -> 400, token não queima)', () => {
  it('POST com cpfPrefix errado -> 400 slug cpf-mismatch; token segue válido', async () => {
    const { app, teardown, activationMailer } = await makeApp();
    const access = await login(app, WRITER_EMAIL);
    await createAndRequest(app, access);
    const token = tokenFromLink(activationMailer.sentLinks[0]!.activationUrl);

    const bad = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '999', ...EMPTY_PERSONAL },
    });
    assert.equal(bad.statusCode, 400);
    assert.ok(JSON.stringify(bad.json()).includes('collaborator-autocadastro-cpf-mismatch'));

    // token não queimou: conclusão correta ainda funciona
    const good = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token, cpfPrefix: '111', ...EMPTY_PERSONAL },
    });
    assert.equal(good.statusCode, 200);
    await teardown();
  });
});

describe('autocadastro — CA6 (rotas públicas sem auth + sem regressão)', () => {
  it('GET e POST de autocadastro não retornam 401 por falta de requireAuth', async () => {
    const { app, teardown } = await makeApp();
    const get = await app.inject({
      method: 'GET',
      url: '/api/v1/collaborators/autocadastro?token=qualquer',
    });
    assert.notEqual(get.statusCode, 401);
    const post = await app.inject({
      method: 'POST',
      url: '/api/v1/collaborators/autocadastro',
      payload: { token: 'qualquer', cpfPrefix: '111', ...EMPTY_PERSONAL },
    });
    assert.notEqual(post.statusCode, 401);
    await teardown();
  });

  it('rota autenticada existente (GET /collaborators) segue exigindo auth -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v1/collaborators' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});
