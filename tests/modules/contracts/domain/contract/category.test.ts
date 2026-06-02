// W0 RED — CTR-CONTRACT-REGISTRATION-METADATA (CA2).
// VO `Category` (Avaliação | Operacional | Processo — rótulos PT no formatter).
// Falha até o W1 criar `src/modules/contracts/domain/contract/category.ts`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Category from '#src/modules/contracts/domain/contract/category.ts';

describe('Category.parse', () => {
  it('accepts the three known codes', () => {
    for (const raw of ['Evaluation', 'Operational', 'Process']) {
      const r = Category.parse(raw);
      assert.equal(r.ok, true, `expected ${raw} to parse`);
      if (r.ok) assert.equal(r.value, raw);
    }
  });

  it('rejects an unknown code with invalid-category', () => {
    const r = Category.parse('Avaliacao');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-category');
  });
});
