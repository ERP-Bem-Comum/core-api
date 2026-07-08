// BDG-COST-STRUCTURE (#316) — W0 RED. VO CostDirection: direcionamento do Centro de Custo (legado CostCenterType).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CostDirection from '#src/modules/budget-plans/domain/cost-structure/cost-direction.ts';

describe('CostDirection — "A PAGAR" / "A RECEBER" (valores exatos do legado)', () => {
  it('aceita os 2 direcionamentos', () => {
    assert.equal(CostDirection.parse('A PAGAR').ok, true);
    assert.equal(CostDirection.parse('A RECEBER').ok, true);
  });

  it('rejeita fora do enum', () => {
    assert.equal(CostDirection.parse('PAGAR').ok, false);
    assert.equal(CostDirection.parse('').ok, false);
  });
});
