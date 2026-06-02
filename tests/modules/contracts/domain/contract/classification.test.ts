// W0 RED — CTR-CONTRACT-REGISTRATION-METADATA (CA2).
// VO `Classification` (Contrato | Ordem de Serviço). Falha até o W1 criar
// `src/modules/contracts/domain/contract/classification.ts` (import abaixo
// falha no load). Padrão: espelha `partners/.../occupation-area.ts` —
// smart constructor `parse(raw): Result<Classification, 'invalid-classification'>`.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Classification from '#src/modules/contracts/domain/contract/classification.ts';

describe('Classification.parse', () => {
  it('accepts the two known codes', () => {
    for (const raw of ['Contract', 'ServiceOrder']) {
      const r = Classification.parse(raw);
      assert.equal(r.ok, true, `expected ${raw} to parse`);
      if (r.ok) assert.equal(r.value, raw);
    }
  });

  it('rejects an unknown code with invalid-classification', () => {
    const r = Classification.parse('Contrato');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invalid-classification');
  });

  it('rejects empty string', () => {
    const r = Classification.parse('');
    assert.equal(r.ok, false);
  });
});
