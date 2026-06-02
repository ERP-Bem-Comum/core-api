// W0 RED — CTR-CONTRACT-REGISTRATION-METADATA (CA2).
// VO `CostCenter` (RH | Serviços Gerais | Eventos — rótulos PT no formatter).
// Falha até o W1 criar `src/modules/contracts/domain/contract/cost-center.ts`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CostCenter from '#src/modules/contracts/domain/contract/cost-center.ts';

describe('CostCenter.parse', () => {
  it('accepts the three known codes', () => {
    for (const raw of ['HR', 'GeneralServices', 'Events']) {
      const r = CostCenter.parse(raw);
      assert.equal(r.ok, true, `expected ${raw} to parse`);
      if (r.ok) assert.equal(r.value, raw);
    }
  });

  it('rejects an unknown code with invalid-cost-center', () => {
    const r = CostCenter.parse('RecursosHumanos');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-cost-center');
  });
});
