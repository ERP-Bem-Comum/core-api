/**
 * PAR-COLLABORATOR-PROFILE-FIELDS (US2). VO `Sex` (F|M), independente de `genderIdentity`.
 * DEVE FALHAR no W0: `domain/collaborator/sex.ts` ainda não existe. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Sex from '#src/modules/partners/domain/collaborator/sex.ts';

describe('Sex (VO US2)', () => {
  it('aceita F e M', () => {
    assert.ok(Sex.parse('F').ok);
    assert.ok(Sex.parse('M').ok);
  });

  it('rejeita valor fora de F|M → sex-invalid', () => {
    const r = Sex.parse('X');
    assert.ok(!r.ok);
    assert.equal(r.error, 'sex-invalid');
  });
});
