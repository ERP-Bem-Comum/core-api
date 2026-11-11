import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/primitives/result.ts';
import { budgetSumsFromRows } from '#src/modules/budget-plans/adapters/persistence/mappers/budget-result.mapper.ts';

const B1 = '10000000-0000-4000-8000-000000000001';
const B2 = '20000000-0000-4000-8000-000000000002';

describe('budgetSumsFromRows — SUM em texto decimal → mapa de Money', () => {
  it('uma entrada por linha, com a soma convertida', () => {
    const r = budgetSumsFromRows([
      { budgetId: B1, sumCents: '209000' },
      { budgetId: B2, sumCents: '0' },
    ]);
    assert.ok(isOk(r));
    assert.deepEqual(
      [...r.value].map(([id, m]) => [id, m.cents]),
      [
        [B1, 209000],
        [B2, 0],
      ],
    );
  });

  it('sem linhas → mapa vazio', () => {
    const r = budgetSumsFromRows([]);
    assert.ok(isOk(r));
    assert.equal(r.value.size, 0);
  });

  it('soma igual a MAX_SAFE_INTEGER é aceita', () => {
    const r = budgetSumsFromRows([{ budgetId: B1, sumCents: '9007199254740991' }]);
    assert.ok(isOk(r));
    assert.equal(r.value.get(B1)?.cents, Number.MAX_SAFE_INTEGER);
  });

  for (const sumCents of ['9007199254740992', '9007199254740993', '10000000000000000']) {
    it(`soma ${sumCents} (acima de MAX_SAFE_INTEGER) → budget-result-sum-exceeds-safe-integer`, () => {
      assert.deepEqual(
        budgetSumsFromRows([
          { budgetId: B2, sumCents: '1' },
          { budgetId: B1, sumCents },
        ]),
        { ok: false, error: 'budget-result-sum-exceeds-safe-integer' },
      );
    });
  }

  for (const sumCents of ['-1', '1.5', 'abc']) {
    it(`soma ${sumCents} (negativa ou não inteira) → budget-result-corrupt`, () => {
      assert.deepEqual(budgetSumsFromRows([{ budgetId: B1, sumCents }]), {
        ok: false,
        error: 'budget-result-corrupt',
      });
    });
  }
});
