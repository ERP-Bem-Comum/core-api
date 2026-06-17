/**
 * PAR-COLLABORATOR-PROFILE-FIELDS (US2). VO `MaritalStatus`.
 * DEVE FALHAR no W0: `domain/collaborator/civil-status.ts` ainda não existe. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as MaritalStatus from '#src/modules/partners/domain/collaborator/civil-status.ts';

describe('MaritalStatus (VO US2)', () => {
  it('aceita os 5 estados civis', () => {
    for (const v of ['single', 'married', 'divorced', 'widowed', 'stable_union']) {
      assert.ok(MaritalStatus.parse(v).ok, `esperado ok para ${v}`);
    }
  });

  it('rejeita valor fora do enum → marital-status-invalid', () => {
    const r = MaritalStatus.parse('complicated');
    assert.ok(!r.ok);
    assert.equal(r.error, 'marital-status-invalid');
  });
});
