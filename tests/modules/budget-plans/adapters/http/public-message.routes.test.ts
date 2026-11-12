/**
 * Mensagem pública nas respostas de erro do plugin de budget-plans (CAS-105): nenhum 5xx mostra
 * frase específica.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { err } from '#src/shared/primitives/result.ts';
import { GENERIC_PUBLIC_MESSAGES } from '#src/shared/http/public-message.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  budgetPlansHttpPlugin,
  buildBudgetPlansHttpDeps,
} from '#src/modules/budget-plans/public-api/http.ts';
import type { BudgetPlansHttpDeps } from '#src/modules/budget-plans/adapters/http/composition.ts';
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const USER_EMAIL = 'public.message@example.com';
const BUDGET_ID = '88888888-8888-4888-8888-888888888888';

const makeApp = async (withDeps: (deps: BudgetPlansHttpDeps) => BudgetPlansHttpDeps) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: USER_EMAIL,
          password: STRONG,
          permissions: [BUDGET_PLAN_PERMISSION.read, BUDGET_PLAN_PERMISSION.write],
        },
      ],
    },
  });
  const bpDeps = await buildBudgetPlansHttpDeps({ driver: 'memory' });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      budgetPlansHttpPlugin(withDeps(bpDeps), {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const login = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: USER_EMAIL, password: STRONG },
  });
  const token = (login.json() as { accessToken: string }).accessToken;
  const teardown = async (): Promise<void> => {
    await app.close();
    await bpDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, token, teardown };
};

describe('budget-plans — 5xx nunca mostra frase específica', () => {
  it('503 budget-result-corrupt: frase genérica interna, code inalterado', async () => {
    const { app, token, teardown } = await makeApp((d) => ({
      ...d,
      getBudgetResults: () => Promise.resolve(err('budget-result-corrupt')),
    }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/budget-plans/budget-results/by-budget/${BUDGET_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 503, res.body);
    const body = res.json() as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'budget-result-corrupt');
    assert.equal(body.error.message, GENERIC_PUBLIC_MESSAGES.internal);
    await teardown();
  });

  it('4xx continua com a frase específica da tabela', async () => {
    const { app, token, teardown } = await makeApp((d) => ({
      ...d,
      getBudgetResults: () => Promise.resolve(err('budget-id-invalid')),
    }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/budget-plans/budget-results/by-budget/${BUDGET_ID}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 422, res.body);
    const body = res.json() as { error: { code: string; message: string } };
    assert.equal(body.error.code, 'budget-id-invalid');
    assert.equal(body.error.message, 'Identificador de orçamento inválido.');
    await teardown();
  });
});
