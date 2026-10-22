/**
 * BGP-BUDGET-TOTAL-DERIVED (#458) — W0 RED — o total do plano/rede é DERIVADO dos lançamentos.
 *
 * Decisão A da P.O. (2026-07-15): o `valueInCents` informado é invenção do core-api v2 (o legado não
 * o tem e nunca o persiste). Some do input; o total passa a ser a soma dos `bgp_budget_results`.
 *
 * O bug que a P.O. vê: a LISTA mostra R$ 0,00 (informado) e o DETALHE do mesmo plano mostra o
 * calculado — dois números para o mesmo plano. Estes testes travam que as duas visões COINCIDEM.
 *
 * RED esperado: hoje o total vem de `budgets[].value` (informado, sempre 0), e `addBudgetBodySchema`
 * ainda aceita `valueInCents`.
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
const WRITER_EMAIL = 'total.writer@example.com';
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
const STATE_REF = 'CE';
const SUB_IPCA = '22222222-2222-4222-8222-222222222222';
const SUB_LOG = '33333333-3333-4333-8333-333333333333';
const PROGRAM_PARC = '44444444-4444-4444-8444-444444444444';

// IPCA: base * (1 + ipca/100) = 100000 * 1.045 = 104500. Dois meses (upsert por mês) = 209000.
const IPCA_BASE = 100000;
const IPCA_PCT = 4.5;
const IPCA_ONE = 104500;

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
        { ref: PROGRAM_ETI, name: 'Ensino em Tempo Integral', abbreviation: 'ETI', active: true },
        { ref: PROGRAM_PARC, name: 'Parceria', abbreviation: 'PARC', active: true },
      ],
      subcategoryLaunchTypes: { [SUB_IPCA]: 'IPCA', [SUB_LOG]: 'DESPESAS_LOGISTICAS' },
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

type App = Awaited<ReturnType<typeof buildApp>>;
const H = (t: string) => ({ authorization: `Bearer ${t}` });

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const createPlan = async (
  app: App,
  token: string,
  year = 2026,
  programRef = PROGRAM_ETI,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: H(token),
    payload: { year, programRef },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

// Criar orçamento = plano + rede, SEM valor (CA6).
const addBudget = async (
  app: App,
  token: string,
  planId: string,
  partnerRef = STATE_REF,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/budgets`,
    headers: H(token),
    payload: { partnerKind: 'state', partnerRef },
  });
  assert.equal(res.statusCode, 201, `add budget sem valueInCents deve funcionar: ${res.body}`);
  return (res.json() as { id: string }).id;
};

const launchIpca = (app: App, token: string, budgetId: string, month: number) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans/budget-results/ipca',
    headers: H(token),
    payload: {
      budgetId,
      subcategoryId: SUB_IPCA,
      month,
      baseValueInCents: IPCA_BASE,
      ipca: IPCA_PCT,
    },
  });

const getDetail = async (app: App, token: string, planId: string) => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v2/budget-plans/${planId}`,
    headers: H(token),
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json() as {
    totalInCents: number;
    budgets: { id: string; valueInCents: number }[];
  };
};

const getListTotal = async (app: App, token: string, planId: string): Promise<number> => {
  const res = await app.inject({ method: 'GET', url: '/api/v2/budget-plans', headers: H(token) });
  assert.equal(res.statusCode, 200, res.body);
  const items = (res.json() as { items: { id: string; totalInCents: number }[] }).items;
  const item = items.find((i) => i.id === planId);
  assert.ok(item !== undefined, 'o plano deve estar na lista');
  return item.totalInCents;
};

describe('total derivado — o número bate entre as telas (#458, CA1/CA4/CA5)', () => {
  it('CA1: GET /:id → totalInCents = soma dos lançamentos; e o valueInCents da Rede idem', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);

      assert.equal((await launchIpca(app, token, budgetId, 1)).statusCode, 201);
      assert.equal((await launchIpca(app, token, budgetId, 2)).statusCode, 201);

      const detail = await getDetail(app, token, planId);
      assert.equal(detail.totalInCents, IPCA_ONE * 2, 'total do plano = soma dos 2 meses');
      const rede = detail.budgets.find((b) => b.id === budgetId);
      assert.equal(
        rede?.valueInCents,
        IPCA_ONE * 2,
        'o total POR REDE também é a soma dos lançamentos',
      );
    } finally {
      await teardown();
    }
  });

  it('CA5+CA1: a LISTA mostra o mesmo total do detalhe — não R$ 0,00', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      await launchIpca(app, token, budgetId, 1);

      const listTotal = await getListTotal(app, token, planId);
      const detail = await getDetail(app, token, planId);
      assert.equal(listTotal, IPCA_ONE, 'a lista deixou de mostrar zero');
      assert.equal(listTotal, detail.totalInCents, 'lista e detalhe COINCIDEM (SC-002)');
    } finally {
      await teardown();
    }
  });

  it('CA3: orçamento sem lançamentos → total R$ 0,00 (não "não informado")', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await addBudget(app, token, planId);

      const detail = await getDetail(app, token, planId);
      assert.equal(detail.totalInCents, 0);
      assert.equal(detail.budgets[0]?.valueInCents, 0, 'Rede sem lançamento = 0');
    } finally {
      await teardown();
    }
  });

  it('CA2: recalcular o mês (upsert) não duplica — o total reflete o novo valor', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);

      await launchIpca(app, token, budgetId, 1); // 104500
      await launchIpca(app, token, budgetId, 1); // recalcula o MESMO mês → continua 104500

      const detail = await getDetail(app, token, planId);
      assert.equal(detail.totalInCents, IPCA_ONE, 'upsert do mês não soma em dobro');
    } finally {
      await teardown();
    }
  });
});

describe('total derivado — CA6: valueInCents sai do input', () => {
  it('POST /budgets ainda funciona SEM valueInCents (criar = plano + rede)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/budgets`,
        headers: H(token),
        payload: { partnerKind: 'state', partnerRef: STATE_REF },
      });
      assert.equal(res.statusCode, 201, res.body);
      // a resposta do orçamento novo traz total 0 (nasce sem lançamento)
      assert.equal((res.json() as { valueInCents: number }).valueInCents, 0);
    } finally {
      await teardown();
    }
  });
});

describe('total derivado — CA7: insights usam o Planejado derivado', () => {
  it('o Planejado (current.totalInCents) dos insights = soma dos lançamentos', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      await launchIpca(app, token, budgetId, 1);
      await launchIpca(app, token, budgetId, 2);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}/insights`,
        headers: H(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { current: { totalInCents: number } };
      assert.equal(body.current.totalInCents, IPCA_ONE * 2, 'Planejado = soma dos lançamentos');
    } finally {
      await teardown();
    }
  });
});

// Regressão do Blocker do W2: a response 201 de calibração/cenário fixava total 0, mas o filho volta
// com os lançamentos clonados do pai — mostrava R$ 0,00 enquanto o detalhe do mesmo plano mostrava o
// total real. Era o bug-mãe do #458 reintroduzido numa resposta HTTP.
//
// Estes casos montam a ÁRVORE de custos e lançam numa subcategoria dela — o clone remapeia cada
// lançamento pela subcategoria clonada. Desde a #1092, lançamento fora da árvore do plano não é mais
// ignorado: a cópia inteira é recusada com `budget-result-orphan-subcategory` (409).
describe('total derivado — lifecycle-create devolve o total do filho clonado (#458, W2)', () => {
  // Monta 1 centro → 1 categoria → 1 subcategoria(IPCA) e devolve o subId real da árvore.
  const seedTreeSub = async (app: App, token: string, planId: string): Promise<string> => {
    const cc = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/cost-structure/cost-centers`,
      headers: H(token),
      payload: { name: 'Operacional', direction: 'A PAGAR' },
    });
    assert.equal(cc.statusCode, 201, cc.body);
    const ccId = (cc.json() as { costCenters: { id: string }[] }).costCenters[0]!.id;
    const cat = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/cost-structure/categories`,
      headers: H(token),
      payload: { costCenterId: ccId, name: 'Pessoal' },
    });
    assert.equal(cat.statusCode, 201, cat.body);
    const catId = (cat.json() as { costCenters: { categories: { id: string }[] }[] })
      .costCenters[0]!.categories[0]!.id;
    const sub = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/cost-structure/subcategories`,
      headers: H(token),
      payload: { categoryId: catId, name: 'Salários', launchType: 'IPCA' },
    });
    assert.equal(sub.statusCode, 201, sub.body);
    return (
      sub.json() as {
        costCenters: { categories: { subcategories: { id: string }[] }[] }[];
      }
    ).costCenters[0]!.categories[0]!.subcategories[0]!.id;
  };

  const launchOn = (app: App, token: string, budgetId: string, subId: string, month: number) =>
    app.inject({
      method: 'POST',
      url: '/api/v2/budget-plans/budget-results/ipca',
      headers: H(token),
      payload: {
        budgetId,
        subcategoryId: subId,
        month,
        baseValueInCents: IPCA_BASE,
        ipca: IPCA_PCT,
      },
    });

  const approve = (app: App, token: string, id: string) =>
    app.inject({ method: 'POST', url: `/api/v2/budget-plans/${id}/approve`, headers: H(token) });

  it('calibração: a response 201 mostra o total dos lançamentos clonados, não 0', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      const subId = await seedTreeSub(app, token, planId);
      assert.equal((await launchOn(app, token, budgetId, subId, 1)).statusCode, 201);
      assert.equal((await launchOn(app, token, budgetId, subId, 2)).statusCode, 201);
      assert.equal((await approve(app, token, planId)).statusCode, 200);

      const cal = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/start-calibration`,
        headers: H(token),
      });
      assert.equal(cal.statusCode, 201, cal.body);
      const child = cal.json() as { id: string; totalInCents: number };
      assert.equal(child.totalInCents, IPCA_ONE * 2, 'a 201 já traz o total clonado, não 0');

      // E o detalhe do filho concorda (não há dois números para o mesmo plano).
      const detail = await getDetail(app, token, child.id);
      assert.equal(detail.totalInCents, child.totalInCents, 'response 201 == detalhe');
    } finally {
      await teardown();
    }
  });

  it('cenário: a response 201 mostra o total dos lançamentos clonados, não 0', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      const subId = await seedTreeSub(app, token, planId);
      assert.equal((await launchOn(app, token, budgetId, subId, 1)).statusCode, 201);

      const sc = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/scenery`,
        headers: H(token),
        payload: { name: 'Otimista' },
      });
      assert.equal(sc.statusCode, 201, sc.body);
      const child = sc.json() as { id: string; totalInCents: number };
      assert.equal(child.totalInCents, IPCA_ONE, 'a 201 já traz o total clonado, não 0');
      const detail = await getDetail(app, token, child.id);
      assert.equal(detail.totalInCents, child.totalInCents, 'response 201 == detalhe');
    } finally {
      await teardown();
    }
  });
});

describe('total derivado — CA4: consolidado usa a mesma fonte', () => {
  it('o total do plano no consolidado = soma dos lançamentos (bate com o detalhe)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      await launchIpca(app, token, budgetId, 1);
      await launchIpca(app, token, budgetId, 2);

      // aprova (o consolidado agrega só APROVADO)
      const approve = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/approve`,
        headers: H(token),
      });
      assert.equal(approve.statusCode, 200, approve.body);

      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/consolidated-result?year=2026`,
        headers: H(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as {
        totalCents: number;
        plans: { id: string; totalCents: number }[];
      };
      const plan = body.plans.find((p) => p.id === planId);
      assert.equal(plan?.totalCents, IPCA_ONE * 2, 'consolidado usa a soma derivada');
      assert.equal(body.totalCents, IPCA_ONE * 2, 'o total geral idem');
    } finally {
      await teardown();
    }
  });
});

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const normalize = (value: unknown, known: Readonly<Record<string, string>>): unknown => {
  const labels = new Map<string, string>(Object.entries(known));
  let next = 1;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') {
      if (ISO_DATE.test(v)) return '<date>';
      if (!UUID.test(v)) return v;
      const label = labels.get(v) ?? `<uuid${next++}>`;
      labels.set(v, label);
      return label;
    }
    if (Array.isArray(v)) return v.map(walk);
    if (v !== null && typeof v === 'object') {
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    }
    return v;
  };
  return walk(value);
};

const MAX = Number.MAX_SAFE_INTEGER;

type Logistics = Partial<{
  people: number;
  trips: number;
  airfare: number;
  dA: number;
  accom: number;
  dF: number;
  food: number;
  dT: number;
  transport: number;
  dC: number;
  car: number;
}>;

const launchLogistics = async (
  app: App,
  token: string,
  budgetId: string,
  subId: string,
  month: number,
  l: Logistics,
): Promise<number> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans/budget-results/logistics-expenses',
    headers: H(token),
    payload: {
      budgetId,
      subcategoryId: subId,
      month,
      numberOfPeople: l.people ?? 1,
      totalTrips: l.trips ?? 1,
      airfareInCents: l.airfare ?? 0,
      dailyAccommodation: l.dA ?? 0,
      accommodationInCents: l.accom ?? 0,
      dailyFood: l.dF ?? 0,
      foodInCents: l.food ?? 0,
      dailyTransport: l.dT ?? 0,
      transportInCents: l.transport ?? 0,
      dailyCarAndFuel: l.dC ?? 0,
      carAndFuelInCents: l.car ?? 0,
    },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { valueInCents: number }).valueInCents;
};

const FIVE_E15: Logistics = { people: 100_000, trips: 5, airfare: 10_000_000_000 };
const FOUR_E15: Logistics = {
  dA: 100_000,
  accom: 10_000_000_000,
  dF: 100_000,
  food: 10_000_000_000,
  dT: 100_000,
  transport: 10_000_000_000,
  dC: 100_000,
  car: 10_000_000_000,
};
const maxMinus8e15Minus = (minus: number): Logistics => ({
  dA: 100_000,
  accom: 10_000_000_000,
  dF: 100_000,
  food: 71_992_547,
  airfare: 40_991 - minus,
});

const seedTree = async (
  app: App,
  token: string,
  planId: string,
  launchType: 'IPCA' | 'DESPESAS_LOGISTICAS',
): Promise<string> => {
  const cc = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/cost-structure/cost-centers`,
    headers: H(token),
    payload: { name: 'Operacional', direction: 'A PAGAR' },
  });
  assert.equal(cc.statusCode, 201, cc.body);
  const ccId = (cc.json() as { costCenters: { id: string }[] }).costCenters[0]!.id;
  const cat = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/cost-structure/categories`,
    headers: H(token),
    payload: { costCenterId: ccId, name: 'Pessoal' },
  });
  assert.equal(cat.statusCode, 201, cat.body);
  const catId = (cat.json() as { costCenters: { categories: { id: string }[] }[] }).costCenters[0]!
    .categories[0]!.id;
  const sub = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/cost-structure/subcategories`,
    headers: H(token),
    payload: { categoryId: catId, name: 'Viagens', launchType },
  });
  assert.equal(sub.statusCode, 201, sub.body);
  return (
    sub.json() as {
      costCenters: { categories: { subcategories: { id: string }[] }[] }[];
    }
  ).costCenters[0]!.categories[0]!.subcategories[0]!.id;
};

const seedRealistic = async (app: App, token: string) => {
  const planId = await createPlan(app, token);
  const b1 = await addBudget(app, token, planId, 'CE');
  const b2 = await addBudget(app, token, planId, 'PI');
  const subId = await seedTree(app, token, planId, 'IPCA');
  for (const [budgetId, month] of [
    [b1, 1],
    [b1, 2],
    [b2, 1],
  ] as const) {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/budget-plans/budget-results/ipca',
      headers: H(token),
      payload: {
        budgetId,
        subcategoryId: subId,
        month,
        baseValueInCents: IPCA_BASE,
        ipca: IPCA_PCT,
      },
    });
    assert.equal(res.statusCode, 201, res.body);
  }
  const known = { [planId]: '<plan>', [b1]: '<b1>', [b2]: '<b2>', [PROGRAM_ETI]: '<program>' };
  return { planId, b1, b2, subId, known };
};

const call = (app: App, token: string, method: 'GET' | 'POST', url: string, payload?: object) =>
  app.inject({
    method,
    url: `/api/v2${url}`,
    headers: H(token),
    ...(payload === undefined ? {} : { payload }),
  });

describe('totais derivados — resposta realista fixada (regressão do guarda de overflow)', () => {
  it('GET /budget-plans', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const { known } = await seedRealistic(app, token);
      const res = await call(app, token, 'GET', '/budget-plans');
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(normalize(res.json(), known), {
        items: [
          {
            id: '<plan>',
            year: 2026,
            status: 'RASCUNHO',
            version: '1.0',
            programRef: '<program>',
            programName: 'Ensino em Tempo Integral',
            totalInCents: 313500,
            updatedAt: '<date>',
            updatedByRef: '<uuid1>',
            partnersCount: 2,
            networkKind: 'state',
            parentId: null,
            scenarioName: null,
          },
        ],
        total: 1,
      });
    } finally {
      await teardown();
    }
  });

  it('GET /budget-plans/:id', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const { planId, known } = await seedRealistic(app, token);
      const res = await call(app, token, 'GET', `/budget-plans/${planId}`);
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(normalize(res.json(), known), {
        id: '<plan>',
        year: 2026,
        status: 'RASCUNHO',
        version: '1.0',
        programRef: '<program>',
        programName: 'Ensino em Tempo Integral',
        budgets: [
          { id: '<b1>', partner: { kind: 'state', ref: 'CE' }, valueInCents: 209000 },
          { id: '<b2>', partner: { kind: 'state', ref: 'PI' }, valueInCents: 104500 },
        ],
        totalInCents: 313500,
        createdAt: '<date>',
        updatedAt: '<date>',
        updatedByRef: '<uuid1>',
      });
    } finally {
      await teardown();
    }
  });

  it('GET /budget-plans/:id/insights', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const { planId, known } = await seedRealistic(app, token);
      const res = await call(app, token, 'GET', `/budget-plans/${planId}/insights`);
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(normalize(res.json(), known), {
        current: { year: 2026, totalInCents: 313500, realizedInCents: 0 },
        previousYears: [],
        networksCount: 2,
      });
    } finally {
      await teardown();
    }
  });

  it('POST /budget-plans/:id/scenery e GET /budget-plans/:id/children', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const { planId, known } = await seedRealistic(app, token);
      const sc = await call(app, token, 'POST', `/budget-plans/${planId}/scenery`, {
        name: 'Otimista',
      });
      assert.equal(sc.statusCode, 201, sc.body);
      const childId = (sc.json() as { id: string }).id;
      const k = { ...known, [childId]: '<child>' };
      assert.deepEqual(normalize(sc.json(), k), {
        id: '<child>',
        year: 2026,
        programRef: '<program>',
        status: 'RASCUNHO',
        version: '1.1',
        scenarioName: 'Otimista',
        parentId: '<plan>',
        totalInCents: 313500,
      });
      const children = await call(app, token, 'GET', `/budget-plans/${planId}/children`);
      assert.equal(children.statusCode, 200, children.body);
      assert.deepEqual(normalize(children.json(), k), {
        items: [
          {
            id: '<child>',
            version: '1.1',
            scenarioName: 'Otimista',
            status: 'RASCUNHO',
            totalInCents: 313500,
            updatedByRef: '<uuid1>',
          },
        ],
      });
    } finally {
      await teardown();
    }
  });

  it('POST approve, POST start-calibration e GET consolidated-result', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const { planId, known } = await seedRealistic(app, token);
      const approve = await call(app, token, 'POST', `/budget-plans/${planId}/approve`);
      assert.equal(approve.statusCode, 200, approve.body);
      assert.deepEqual(normalize(approve.json(), known), {
        id: '<plan>',
        year: 2026,
        programRef: '<program>',
        status: 'APROVADO',
        version: '1.0',
        scenarioName: null,
        parentId: null,
        totalInCents: 313500,
      });
      const cal = await call(app, token, 'POST', `/budget-plans/${planId}/start-calibration`);
      assert.equal(cal.statusCode, 201, cal.body);
      const childId = (cal.json() as { id: string }).id;
      const k = { ...known, [childId]: '<child>' };
      assert.deepEqual(normalize(cal.json(), k), {
        id: '<child>',
        year: 2026,
        programRef: '<program>',
        status: 'EM_CALIBRACAO',
        version: '2.0',
        scenarioName: null,
        parentId: '<plan>',
        totalInCents: 313500,
      });
      const cons = await call(app, token, 'GET', '/budget-plans/consolidated-result?year=2026');
      assert.equal(cons.statusCode, 200, cons.body);
      assert.deepEqual(normalize(cons.json(), k), {
        year: 2026,
        totalCents: 313500,
        plans: [
          {
            id: '<plan>',
            programName: 'Ensino em Tempo Integral',
            programAbbreviation: 'ETI',
            version: 1,
            totalCents: 313500,
          },
        ],
      });
    } finally {
      await teardown();
    }
  });
});

const SUM_OVERFLOW = {
  code: 'budget-result-sum-exceeds-safe-integer',
  message: 'A soma dos lançamentos de um orçamento excede o limite monetário permitido.',
} as const;
const PLAN_OVERFLOW = {
  code: 'budget-plan-total-exceeds-safe-integer',
  message: 'A soma dos lançamentos de um plano excede o limite monetário permitido.',
} as const;
const CONSOLIDATED_OVERFLOW = {
  code: 'consolidated-total-exceeds-safe-integer',
  message: 'A soma dos planos consolidados excede o limite monetário permitido.',
} as const;

type InjectResponse = Awaited<ReturnType<App['inject']>>;

const assertOverflow = (
  res: InjectResponse,
  expected: Readonly<{ code: string; message: string }>,
): void => {
  assert.equal(res.statusCode, 422, res.body);
  const body = res.json() as { error: { code: string; message: string; requestId: unknown } };
  assert.equal(body.error.code, expected.code);
  assert.equal(body.error.message, expected.message);
  assert.equal(typeof body.error.requestId, 'string');
};

const statusOf = async (app: App, token: string, planId: string): Promise<string> => {
  const res = await call(app, token, 'GET', `/budget-plans/${planId}`);
  assert.equal(res.statusCode, 200, res.body);
  return (res.json() as { status: string }).status;
};

describe('totais derivados — overflow vira 422, nunca 500', () => {
  const seedOneBudgetOverflow = async (app: App, token: string, planId: string) => {
    const budgetId = await addBudget(app, token, planId);
    const subId = await seedTree(app, token, planId, 'DESPESAS_LOGISTICAS');
    assert.equal(await launchLogistics(app, token, budgetId, subId, 1, FIVE_E15), 5e15);
    assert.equal(await launchLogistics(app, token, budgetId, subId, 2, FIVE_E15), 5e15);
    return { budgetId, subId };
  };

  it('5e15 + 5e15 na mesma Rede: lista, detalhe, insights e consolidado → 422; recortes sem ela → 200', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      const approved = await call(app, token, 'POST', `/budget-plans/${planId}/approve`);
      assert.equal(approved.statusCode, 200, approved.body);
      await launchLogistics(app, token, budgetId, SUB_LOG, 1, FIVE_E15);
      await launchLogistics(app, token, budgetId, SUB_LOG, 2, FIVE_E15);

      const other = await createPlan(app, token, 2027, PROGRAM_PARC);
      const otherBudget = await addBudget(app, token, other);
      await launchLogistics(app, token, otherBudget, SUB_LOG, 1, { airfare: 700 });
      assert.equal(
        (await call(app, token, 'POST', `/budget-plans/${other}/approve`)).statusCode,
        200,
      );

      for (const url of [
        '/budget-plans',
        `/budget-plans/${planId}`,
        `/budget-plans/${planId}/insights`,
        '/budget-plans/consolidated-result?year=2026',
      ]) {
        assertOverflow(await call(app, token, 'GET', url), SUM_OVERFLOW);
      }

      const list2027 = await call(app, token, 'GET', '/budget-plans?year=2027');
      assert.equal(list2027.statusCode, 200, list2027.body);
      assert.deepEqual(
        (list2027.json() as { items: { id: string; totalInCents: number }[] }).items.map((i) => [
          i.id,
          i.totalInCents,
        ]),
        [[other, 700]],
      );
      const cons2027 = await call(app, token, 'GET', '/budget-plans/consolidated-result?year=2027');
      assert.equal(cons2027.statusCode, 200, cons2027.body);
      assert.equal((cons2027.json() as { totalCents: number }).totalCents, 700);
    } finally {
      await teardown();
    }
  });

  it('children: filho com 5e15 + 5e15 numa Rede → 422', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await addBudget(app, token, planId);
      const sc = await call(app, token, 'POST', `/budget-plans/${planId}/scenery`, { name: 'X' });
      assert.equal(sc.statusCode, 201, sc.body);
      const childId = (sc.json() as { id: string }).id;
      const child = await call(app, token, 'GET', `/budget-plans/${childId}`);
      const childBudget = (child.json() as { budgets: { id: string }[] }).budgets[0]!.id;
      await launchLogistics(app, token, childBudget, SUB_LOG, 1, FIVE_E15);
      await launchLogistics(app, token, childBudget, SUB_LOG, 2, FIVE_E15);

      assertOverflow(
        await call(app, token, 'GET', `/budget-plans/${planId}/children`),
        SUM_OVERFLOW,
      );
    } finally {
      await teardown();
    }
  });

  it('approve com 5e15 + 5e15 numa Rede → 422 e o plano continua RASCUNHO', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { budgetId, subId } = await seedOneBudgetOverflow(app, token, planId);

      assertOverflow(
        await call(app, token, 'POST', `/budget-plans/${planId}/approve`),
        SUM_OVERFLOW,
      );

      await launchLogistics(app, token, budgetId, subId, 2, { airfare: 1 });
      assert.equal(await statusOf(app, token, planId), 'RASCUNHO');
    } finally {
      await teardown();
    }
  });

  it('approve com duas Redes de 5e15 → 422 de total do plano e o plano continua RASCUNHO', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const b1 = await addBudget(app, token, planId, 'CE');
      const b2 = await addBudget(app, token, planId, 'PI');
      await launchLogistics(app, token, b1, SUB_LOG, 1, FIVE_E15);
      await launchLogistics(app, token, b2, SUB_LOG, 1, FIVE_E15);

      assertOverflow(
        await call(app, token, 'POST', `/budget-plans/${planId}/approve`),
        PLAN_OVERFLOW,
      );

      await launchLogistics(app, token, b2, SUB_LOG, 1, { airfare: 1 });
      assert.equal(await statusOf(app, token, planId), 'RASCUNHO');
    } finally {
      await teardown();
    }
  });

  it('scenery de pai com 5e15 + 5e15 numa Rede → 422 e nenhum filho gravado', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await seedOneBudgetOverflow(app, token, planId);

      assertOverflow(
        await call(app, token, 'POST', `/budget-plans/${planId}/scenery`, { name: 'X' }),
        SUM_OVERFLOW,
      );

      const children = await call(app, token, 'GET', `/budget-plans/${planId}/children`);
      assert.equal(children.statusCode, 200, children.body);
      assert.deepEqual(children.json(), { items: [] });
    } finally {
      await teardown();
    }
  });

  it('start-calibration de aprovado com 5e15 + 5e15 numa Rede → 422 e nenhum filho gravado', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      const subId = await seedTree(app, token, planId, 'DESPESAS_LOGISTICAS');
      assert.equal(
        (await call(app, token, 'POST', `/budget-plans/${planId}/approve`)).statusCode,
        200,
      );
      await launchLogistics(app, token, budgetId, subId, 1, FIVE_E15);
      await launchLogistics(app, token, budgetId, subId, 2, FIVE_E15);

      assertOverflow(
        await call(app, token, 'POST', `/budget-plans/${planId}/start-calibration`),
        SUM_OVERFLOW,
      );

      const children = await call(app, token, 'GET', `/budget-plans/${planId}/children`);
      assert.equal(children.statusCode, 200, children.body);
      assert.deepEqual(children.json(), { items: [] });
    } finally {
      await teardown();
    }
  });

  it('duas Redes de 5e15 no mesmo plano: lista, detalhe e insights → 422 de total do plano', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const b1 = await addBudget(app, token, planId, 'CE');
      const b2 = await addBudget(app, token, planId, 'PI');
      await launchLogistics(app, token, b1, SUB_LOG, 1, FIVE_E15);
      await launchLogistics(app, token, b2, SUB_LOG, 1, FIVE_E15);

      for (const url of [
        '/budget-plans',
        `/budget-plans/${planId}`,
        `/budget-plans/${planId}/insights`,
      ]) {
        assertOverflow(await call(app, token, 'GET', url), PLAN_OVERFLOW);
      }
    } finally {
      await teardown();
    }
  });

  it('dois planos aprovados de 5e15 no mesmo ano: consolidado → 422; filtrado por programa → 200', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      for (const program of [PROGRAM_ETI, PROGRAM_PARC]) {
        const planId = await createPlan(app, token, 2026, program);
        const budgetId = await addBudget(app, token, planId);
        await launchLogistics(app, token, budgetId, SUB_LOG, 1, FIVE_E15);
        const ap = await call(app, token, 'POST', `/budget-plans/${planId}/approve`);
        assert.equal(ap.statusCode, 200, ap.body);
      }

      assertOverflow(
        await call(app, token, 'GET', '/budget-plans/consolidated-result?year=2026'),
        CONSOLIDATED_OVERFLOW,
      );

      const filtered = await call(
        app,
        token,
        'GET',
        `/budget-plans/consolidated-result?year=2026&programRef=${PROGRAM_PARC}`,
      );
      assert.equal(filtered.statusCode, 200, filtered.body);
      assert.equal((filtered.json() as { totalCents: number }).totalCents, 5e15);
    } finally {
      await teardown();
    }
  });
});

describe('totais derivados — vizinhança de MAX_SAFE_INTEGER', () => {
  const seedMaxMinus = async (
    app: App,
    token: string,
    budgetId: string,
    subId: string,
    minus: number,
  ) => {
    await launchLogistics(app, token, budgetId, subId, 1, FOUR_E15);
    await launchLogistics(app, token, budgetId, subId, 2, FOUR_E15);
    assert.equal(
      await launchLogistics(app, token, budgetId, subId, 3, maxMinus8e15Minus(minus)),
      MAX - 8e15 - minus,
    );
  };

  it('uma Rede somando MAX → 200 com MAX; recalculada para MAX + 1 → 422', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const budgetId = await addBudget(app, token, planId);
      await seedMaxMinus(app, token, budgetId, SUB_LOG, 0);

      const detail = await call(app, token, 'GET', `/budget-plans/${planId}`);
      assert.equal(detail.statusCode, 200, detail.body);
      const body = detail.json() as { totalInCents: number; budgets: { valueInCents: number }[] };
      assert.equal(body.totalInCents, MAX);
      assert.equal(body.budgets[0]!.valueInCents, MAX);

      await launchLogistics(app, token, budgetId, SUB_LOG, 3, maxMinus8e15Minus(-1));
      assertOverflow(await call(app, token, 'GET', `/budget-plans/${planId}`), SUM_OVERFLOW);
    } finally {
      await teardown();
    }
  });

  it('Redes com MAX - 1 e 1 → 200 com MAX em lista, detalhe e insights; com 2 → 422', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const b1 = await addBudget(app, token, planId, 'CE');
      const b2 = await addBudget(app, token, planId, 'PI');
      await seedMaxMinus(app, token, b1, SUB_LOG, 1);
      await launchLogistics(app, token, b2, SUB_LOG, 1, { airfare: 1 });

      const detail = await call(app, token, 'GET', `/budget-plans/${planId}`);
      assert.equal(detail.statusCode, 200, detail.body);
      const body = detail.json() as { totalInCents: number; budgets: { valueInCents: number }[] };
      assert.equal(body.totalInCents, MAX);
      assert.deepEqual(
        body.budgets.map((b) => b.valueInCents),
        [MAX - 1, 1],
      );
      const list = await call(app, token, 'GET', '/budget-plans');
      assert.equal(list.statusCode, 200, list.body);
      assert.equal(
        (list.json() as { items: { totalInCents: number }[] }).items[0]!.totalInCents,
        MAX,
      );
      const insights = await call(app, token, 'GET', `/budget-plans/${planId}/insights`);
      assert.equal(insights.statusCode, 200, insights.body);
      assert.equal(
        (insights.json() as { current: { totalInCents: number } }).current.totalInCents,
        MAX,
      );

      await launchLogistics(app, token, b2, SUB_LOG, 1, { airfare: 2 });
      assertOverflow(await call(app, token, 'GET', `/budget-plans/${planId}`), PLAN_OVERFLOW);
    } finally {
      await teardown();
    }
  });

  it('planos aprovados com MAX - 1 e 1 → consolidado 200 com MAX; com 2 → 422', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const eti = await createPlan(app, token, 2026, PROGRAM_ETI);
      const etiBudget = await addBudget(app, token, eti);
      await seedMaxMinus(app, token, etiBudget, SUB_LOG, 1);
      const parc = await createPlan(app, token, 2026, PROGRAM_PARC);
      const parcBudget = await addBudget(app, token, parc);
      await launchLogistics(app, token, parcBudget, SUB_LOG, 1, { airfare: 1 });
      for (const id of [eti, parc]) {
        const ap = await call(app, token, 'POST', `/budget-plans/${id}/approve`);
        assert.equal(ap.statusCode, 200, ap.body);
      }

      const cons = await call(app, token, 'GET', '/budget-plans/consolidated-result?year=2026');
      assert.equal(cons.statusCode, 200, cons.body);
      assert.equal((cons.json() as { totalCents: number }).totalCents, MAX);

      await launchLogistics(app, token, parcBudget, SUB_LOG, 1, { airfare: 2 });
      assertOverflow(
        await call(app, token, 'GET', '/budget-plans/consolidated-result?year=2026'),
        CONSOLIDATED_OVERFLOW,
      );
    } finally {
      await teardown();
    }
  });
});
