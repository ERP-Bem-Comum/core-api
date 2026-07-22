/**
 * BGP-MEMORY-SEED-CATALOG — W0 (RED→GREEN) — caminho feliz local do budget-plans no
 * driver memory destravado por seed de catálogo (#330).
 *
 * Este teste NÃO depende do parser `parseE2eBudgetPlansSeed` — injeta o `seed` direto na
 * composition (`buildBudgetPlansHttpDeps({ driver: 'memory', seed })`). A composition JÁ
 * aceita o seed, então estas asserções tendem a JÁ passar. O valor aqui é fixar o comportamento
 * de referência do #330:
 *   - COM seed  → POST /budget-plans com o programRef semeado devolve 201 RASCUNHO (CA1);
 *                 GET /budget-plans/options mostra o programa e as redes (CA2).
 *   - SEM seed  → catálogo memory nasce VAZIO → POST devolve 404 program-not-found. Este é o
 *                 sintoma exato do #330 (o `server.ts` não passava `seed` no ramo memory).
 *
 * O RED do ticket vive no unit `e2e-seed.test.ts` (símbolo `parseE2eBudgetPlansSeed` inexistente).
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
const WRITER_EMAIL = 'seed.writer@example.com';

const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';
// Chave natural do partners (ADR-0006 ACL): estado = UF, município = código IBGE.
const STATE_CE_REF = 'CE';
const MUN_FORTALEZA_REF = '2304400';

const SEED = {
  programs: [
    { ref: PROGRAM_ETI_REF, name: 'Ensino em Tempo Integral', abbreviation: 'ETI', active: true },
  ],
  partnerStates: [{ ref: STATE_CE_REF, name: 'Ceará', uf: 'CE' }],
  partnerMunicipalities: [{ ref: MUN_FORTALEZA_REF, name: 'Fortaleza', uf: 'CE' }],
};

const VALID_BODY = { year: 2026, programRef: PROGRAM_ETI_REF };

// `seed` opcional: ausente reproduz o driver memory "cru" do #330 (catálogo vazio).
const makeApp = async (seed?: typeof SEED) => {
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
  const bpDeps = await buildBudgetPlansHttpDeps(
    seed !== undefined ? { driver: 'memory', seed } : { driver: 'memory' },
  );
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const create = async (app: Awaited<ReturnType<typeof buildApp>>, token: string) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: VALID_BODY,
  });

describe('BGP-MEMORY-SEED-CATALOG — memory sem seed (sintoma do #330)', () => {
  it('SEM seed: catálogo memory vazio → POST /budget-plans → 404 program-not-found', async () => {
    const { app, teardown } = await makeApp(); // sem seed
    const token = await login(app);
    const res = await create(app, token);
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});

describe('BGP-MEMORY-SEED-CATALOG — memory com seed (caminho feliz destravado)', () => {
  it('CA1: COM seed → POST /budget-plans (programRef semeado) → 201 RASCUNHO v1.0', async () => {
    const { app, teardown } = await makeApp(SEED);
    const token = await login(app);
    const res = await create(app, token);
    assert.equal(res.statusCode, 201);
    const body = res.json() as Record<string, unknown>;
    assert.equal(typeof body['id'], 'string');
    assert.equal(body['programRef'], PROGRAM_ETI_REF);
    assert.equal(body['status'], 'RASCUNHO');
    assert.equal(body['version'], '1.0');
    await teardown();
  });

  it('CA2: COM seed → GET /budget-plans/options mostra o programa em programs e as redes em redes', async () => {
    const { app, teardown } = await makeApp(SEED);
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/budget-plans/options',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      programs: { ref: string; name: string; abbreviation: string }[];
      redes: { kind: string; ref: string; name: string; uf: string }[];
    };
    assert.ok(
      body.programs.some((p) => p.ref === PROGRAM_ETI_REF && p.abbreviation === 'ETI'),
      'programa semeado deve aparecer em programs',
    );
    assert.ok(
      body.redes.some((n) => n.kind === 'state' && n.ref === STATE_CE_REF),
      'estado semeado deve aparecer em redes',
    );
    assert.ok(
      body.redes.some((n) => n.kind === 'municipality' && n.ref === MUN_FORTALEZA_REF),
      'município semeado deve aparecer em redes',
    );
    await teardown();
  });
});
