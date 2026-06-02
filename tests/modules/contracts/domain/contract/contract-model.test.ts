// W0 RED — CTR-CONTRACT-REGISTRATION-METADATA (CA2).
// VO `ContractModel` (Serviço | Doação). Falha até o W1 criar
// `src/modules/contracts/domain/contract/contract-model.ts`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ContractModel from '#src/modules/contracts/domain/contract/contract-model.ts';

describe('ContractModel.parse', () => {
  it('accepts the two known codes', () => {
    for (const raw of ['Service', 'Donation']) {
      const r = ContractModel.parse(raw);
      assert.equal(r.ok, true, `expected ${raw} to parse`);
      if (r.ok) assert.equal(r.value, raw);
    }
  });

  it('rejects an unknown code with invalid-contract-model', () => {
    const r = ContractModel.parse('Servico');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-contract-model');
  });
});
