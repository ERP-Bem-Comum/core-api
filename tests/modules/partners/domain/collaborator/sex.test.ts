/**
 * PAR-COLLABORATOR-FIELDS — W0 (RED) — VO `Sex` (#41 CA2).
 *
 * DEVE FALHAR: `domain/collaborator/sex.ts` ainda não existe. GREEN quando o W1 entregar o VO
 * com `parse(raw): Result<Sex, 'sex-invalid'>` (`'F'|'M'`). O slug DEVE ser `sex-invalid`
 * porque a borda faz `toErrorEnvelope(code, code)` (plugin.ts).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Sex from '#src/modules/partners/domain/collaborator/sex.ts';

describe('Sex VO', () => {
  it('aceita F e M', () => {
    assert.equal(Sex.parse('F').ok, true);
    assert.equal(Sex.parse('M').ok, true);
  });

  it('rejeita valor fora do conjunto com slug sex-invalid', () => {
    const r = Sex.parse('X');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'sex-invalid');
  });
});
