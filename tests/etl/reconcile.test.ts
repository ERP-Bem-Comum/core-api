import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  emptyTally,
  countRead,
  countMigrated,
  countQuarantined,
  countAlreadyExists,
  isBalanced,
} from '#scripts/etl/reconcile.ts';

// PARTNERS-ETL-CORE: reconciliação pura por entidade. Invariante:
// read = migrated + quarantined + alreadyExists.

describe('reconcile — tally por entidade', () => {
  it('emptyTally começa zerado e balanceado', () => {
    const t = emptyTally();
    assert.deepEqual(t, { read: 0, migrated: 0, quarantined: 0, alreadyExists: 0 });
    assert.equal(isBalanced(t), true);
  });

  it('contadores são puros (retornam novo tally, não mutam)', () => {
    const t0 = emptyTally();
    const t1 = countRead(t0);
    assert.equal(t0.read, 0, 'original não muta');
    assert.equal(t1.read, 1);
  });

  it('read = migrated + quarantined + alreadyExists fecha o balanço', () => {
    let t = emptyTally();
    // 3 lidos: 1 migrado, 1 quarentenado, 1 já existente
    t = countRead(countRead(countRead(t)));
    t = countMigrated(t);
    t = countQuarantined(t);
    t = countAlreadyExists(t);
    assert.deepEqual(t, { read: 3, migrated: 1, quarantined: 1, alreadyExists: 1 });
    assert.equal(isBalanced(t), true);
  });

  it('isBalanced detecta desbalanço (linha lida não contabilizada)', () => {
    const t = countRead(emptyTally()); // lido mas não classificado
    assert.equal(isBalanced(t), false);
  });
});
