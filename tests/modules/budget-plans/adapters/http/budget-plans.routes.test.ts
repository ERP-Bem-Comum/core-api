/**
 * BGP-PLAN-CRUD — W0 (RED) — contrato HTTP do módulo budget-plans (issue #315).
 *
 * DEVE FALHAR: public-api/http.ts (plugin + composition) ainda não existe.
 * Borda sob o prefixo default /api/v2 (plugin direto, como financial).
 * RBAC: budget-plan:read / budget-plan:write (devem entrar no PermissionCatalog —
 * sem isso nem o seed de usuário consegue a permissão: teste-âncora do catálogo).
 *
 * Mapeamento de erro decidido no 000-request.md:
 *   program-not-found -> 404 · program-not-active -> 422 ·
 *   budget-plan-already-exists -> 409 · budget-plan-not-found -> 404 ·
 *   body malformado (Zod) -> 400/422 (padrão da borda).
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
  budgetPlansHttpPlugin,
  buildBudgetPlansHttpDeps,
} from '#src/modules/budget-plans/public-api/http.ts';
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'budget.writer@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';
const PROGRAM_INACTIVE_REF = '33333333-3333-4333-8333-333333333333';
const PROGRAM_UNKNOWN_REF = '99999999-9999-4999-8999-999999999999';
const STATE_CE_REF = '44444444-4444-4444-8444-444444444444';
const MUN_FORTALEZA_REF = '55555555-5555-4555-8555-555555555555';

const VALID_BODY = { year: 2026, programRef: PROGRAM_ETI_REF };

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [BUDGET_PLAN_PERMISSION.read, BUDGET_PLAN_PERMISSION.write],
        },
      ],
    },
  });
  const bpDeps = await buildBudgetPlansHttpDeps({
    driver: 'memory',
    seed: {
      programs: [
        {
          ref: PROGRAM_ETI_REF,
          name: 'Ensino em Tempo Integral',
          abbreviation: 'ETI',
          active: true,
        },
        { ref: PROGRAM_INACTIVE_REF, name: 'Programa Extinto', abbreviation: 'EXT', active: false },
      ],
      partnerStates: [{ ref: STATE_CE_REF, name: 'Ceará', uf: 'CE' }],
      partnerMunicipalities: [{ ref: MUN_FORTALEZA_REF, name: 'Fortaleza', uf: 'CE' }],
    },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      budgetPlansHttpPlugin(bpDeps, { requireAuth, authorize: authDeps.authorize }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await bpDeps.shutdown();
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

const create = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown> = VALID_BODY,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });

describe('POST /budget-plans', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/budget-plans',
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem budget-plan:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await create(app, token)).statusCode, 403);
    await teardown();
  });

  it('CA1: cria -> 201 + corpo com id/RASCUNHO/versão 1.0', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token);
    assert.equal(res.statusCode, 201);
    const body = res.json() as Record<string, unknown>;
    assert.equal(typeof body['id'], 'string');
    assert.equal(body['year'], 2026);
    assert.equal(body['programRef'], PROGRAM_ETI_REF);
    assert.equal(body['status'], 'RASCUNHO');
    assert.equal(body['version'], '1.0');
    assert.equal(body['totalInCents'], 0);
    await teardown();
  });

  it('CA2: duplicado (mesmo ano+programa) -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await create(app, token)).statusCode, 201);
    assert.equal((await create(app, token)).statusCode, 409);
    await teardown();
  });

  it('programa inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token, { ...VALID_BODY, programRef: PROGRAM_UNKNOWN_REF });
    assert.equal(res.statusCode, 404);
    await teardown();
  });

  it('programa inativo -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token, { ...VALID_BODY, programRef: PROGRAM_INACTIVE_REF });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('body malformado (year string) -> 4xx de validação (não 500)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await create(app, token, { year: 'abc', programRef: PROGRAM_ETI_REF });
    assert.ok(
      res.statusCode === 400 || res.statusCode === 422,
      `esperava 400/422, veio ${res.statusCode}`,
    );
    await teardown();
  });
});

describe('GET /budget-plans', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/budget-plans' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem budget-plan:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/budget-plans',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA3: lista com status/programName/ano/versão/totalInCents', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    await create(app, token);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/budget-plans',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { items: Record<string, unknown>[]; total: number };
    assert.equal(body.total, 1);
    const item = body.items[0];
    assert.ok(item);
    assert.equal(item['year'], 2026);
    assert.equal(item['status'], 'RASCUNHO');
    assert.equal(item['version'], '1.0');
    assert.equal(item['programName'], 'Ensino em Tempo Integral');
    assert.equal(item['totalInCents'], 0);
    await teardown();
  });

  it('filtro ?year= restringe a lista', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    await create(app, token);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/budget-plans?year=1999',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { total: number }).total, 0);
    await teardown();
  });
});

describe('GET /budget-plans/options', () => {
  it('CA5: programas ativos + anos + redes', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/budget-plans/options',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      programs: { ref: string; name: string; abbreviation: string }[];
      years: number[];
      redes: { kind: string; ref: string; name: string; uf: string }[];
    };
    assert.deepEqual(
      body.programs.map((p) => p.abbreviation),
      ['ETI'],
    );
    assert.ok(body.years.length >= 2);
    assert.ok(body.redes.some((n) => n.kind === 'state' && n.ref === STATE_CE_REF));
    assert.ok(body.redes.some((n) => n.kind === 'municipality' && n.ref === MUN_FORTALEZA_REF));
    await teardown();
  });

  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/budget-plans/options' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });
});

describe('GET /budget-plans/:id', () => {
  it('CA4: detalhe com cabeçalho + budgets (vazios na criação) + totalInCents', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = ((await create(app, token)).json() as { id: string }).id;
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/budget-plans/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'], id);
    assert.equal(body['year'], 2026);
    assert.equal(body['status'], 'RASCUNHO');
    assert.equal(body['version'], '1.0');
    assert.equal(body['programName'], 'Ensino em Tempo Integral');
    assert.deepEqual(body['budgets'], []);
    assert.equal(body['totalInCents'], 0);
    await teardown();
  });

  it('id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/budget-plans/${UUID_INEXISTENTE}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});
