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
      ],
      subcategoryLaunchTypes: { [SUB_IPCA]: 'IPCA' },
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

const createPlan = async (app: App, token: string, year = 2026): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: H(token),
    payload: { year, programRef: PROGRAM_ETI },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

// Criar orçamento = plano + rede, SEM valor (CA6).
const addBudget = async (app: App, token: string, planId: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/budgets`,
    headers: H(token),
    payload: { partnerKind: 'state', partnerRef: STATE_REF },
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
// Estes casos montam a ÁRVORE de custos e lançam numa subcategoria dela — só assim o clone copia os
// results para o filho (ele remapeia por subcategoria clonada; lançamento fora da árvore é ignorado).
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
