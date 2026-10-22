import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { addBudgetResult } from '#src/modules/budget-plans/application/use-cases/add-budget-result.ts';
import { getBudgetResults } from '#src/modules/budget-plans/application/use-cases/get-budget-results.ts';
import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { InMemorySubcategoryLaunchTypeReader } from '#src/modules/budget-plans/adapters/persistence/repos/subcategory-launch-type-reader.in-memory.ts';
import { InMemoryBudgetExistsReader } from '#src/modules/budget-plans/adapters/persistence/repos/budget-exists-reader.in-memory.ts';

const BUDGET_ID = '88888888-8888-4888-8888-888888888888';
const SUB_IPCA = '99999999-9999-4999-8999-999999999999';
const MAX = Number.MAX_SAFE_INTEGER;

const seeded = async (valuesByMonth: readonly (readonly [number, number])[]) => {
  const store = InMemoryBudgetResultRepository();
  const add = addBudgetResult({
    budgetResultRepo: store.repo,
    subcategoryReader: InMemorySubcategoryLaunchTypeReader({ [SUB_IPCA]: 'IPCA' }),
    budgetReader: InMemoryBudgetExistsReader([BUDGET_ID]),
  });
  for (const [month, cents] of valuesByMonth) {
    const r = await add({
      budgetId: BUDGET_ID,
      subcategoryId: SUB_IPCA,
      month,
      input: { kind: 'IPCA', baseValueInCents: cents, ipca: 0 },
    });
    if (!r.ok) throw new Error(`test setup: ${r.error}`);
  }
  return getBudgetResults({ budgetResultRepo: store.repo });
};

type TotalCase = Readonly<{
  name: string;
  values: readonly (readonly [number, number])[];
  month?: number;
  expected: Readonly<{ ok: true; total: number }> | Readonly<{ ok: false; error: string }>;
}>;

const CASES: readonly TotalCase[] = [
  {
    name: 'dois lançamentos de MAX_SAFE → budget-results-total-exceeds-safe-integer',
    values: [
      [1, MAX],
      [2, MAX],
    ],
    expected: { ok: false, error: 'budget-results-total-exceeds-safe-integer' },
  },
  {
    name: 'MAX_SAFE + 1 → budget-results-total-exceeds-safe-integer',
    values: [
      [1, MAX],
      [2, 1],
    ],
    expected: { ok: false, error: 'budget-results-total-exceeds-safe-integer' },
  },
  {
    name: 'vizinha válida: (MAX_SAFE − 1) + 1 → total MAX_SAFE',
    values: [
      [1, MAX - 1],
      [2, 1],
    ],
    expected: { ok: true, total: MAX },
  },
  {
    name: 'o recorte por mês soma só o mês pedido: MAX_SAFE em dois meses, ?month=1 → MAX_SAFE',
    values: [
      [1, MAX],
      [2, MAX],
    ],
    month: 1,
    expected: { ok: true, total: MAX },
  },
  {
    name: 'regressão realista: 12 × 367.092 = 4.405.104',
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => [m, 367092] as const),
    expected: { ok: true, total: 4405104 },
  },
  {
    name: 'orçamento sem lançamentos → total 0',
    values: [],
    expected: { ok: true, total: 0 },
  },
];

describe('getBudgetResults — total no limite monetário seguro', () => {
  for (const c of CASES) {
    it(c.name, async () => {
      const get = await seeded(c.values);
      const r = await get(BUDGET_ID, c.month);
      if (c.expected.ok) {
        assert.equal(r.ok, true, JSON.stringify(r));
        if (r.ok) assert.equal(r.value.total.cents, c.expected.total);
      } else {
        assert.deepEqual(r, { ok: false, error: c.expected.error });
      }
    });
  }
});
