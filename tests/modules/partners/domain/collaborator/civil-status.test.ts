/**
 * PAR-COLLABORATOR-FIELDS — W0 (RED) — VO `CivilStatus` (estado civil, #41 CA3).
 *
 * DEVE FALHAR: `domain/collaborator/civil-status.ts` ainda não existe. GREEN quando o W1
 * entregar `parse(raw): Result<CivilStatus, 'marital-status-invalid'>` com o conjunto
 * single|married|divorced|widowed|stable_union. O slug DEVE ser `marital-status-invalid`
 * (borda faz `toErrorEnvelope(code, code)`).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CivilStatus from '#src/modules/partners/domain/collaborator/civil-status.ts';

describe('CivilStatus VO', () => {
  for (const v of ['single', 'married', 'divorced', 'widowed', 'stable_union']) {
    it(`aceita ${v}`, () => {
      assert.equal(CivilStatus.parse(v).ok, true);
    });
  }

  it('rejeita valor fora do conjunto com slug marital-status-invalid', () => {
    const r = CivilStatus.parse('engaged');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'marital-status-invalid');
  });
});
