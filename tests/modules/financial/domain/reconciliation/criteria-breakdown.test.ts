import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { MatchCriteria } from '#src/modules/financial/domain/reconciliation/match-score.ts';
// W0 RED (#140): a função de breakdown dos critérios ainda não existe.
import { criteriaBreakdown } from '#src/modules/financial/domain/reconciliation/match-score.ts';

const base: MatchCriteria = {
  payeeMatch: false,
  exactValue: false,
  dateD0: false,
  memoRef: false,
  supplierOpenCount: 0,
};

const find = (rows: ReturnType<typeof criteriaBreakdown>, key: string) =>
  rows.find((r) => r.criterion === key);

describe('financial/domain/reconciliation/criteria-breakdown (#140)', () => {
  it('todos os critérios atendidos → ok, com pesos corretos (Σ = 100)', () => {
    const rows = criteriaBreakdown({
      payeeMatch: true,
      exactValue: true,
      dateD0: true,
      memoRef: true,
      supplierOpenCount: 1,
    });
    assert.equal(rows.length, 5);
    assert.equal(find(rows, 'exactValue')?.weight, 40);
    assert.equal(find(rows, 'payeeMatch')?.weight, 25);
    assert.equal(find(rows, 'dateD0')?.weight, 20);
    assert.equal(find(rows, 'memoRef')?.weight, 10);
    assert.equal(find(rows, 'supplierOpen')?.weight, 5);
    assert.equal(
      rows.reduce((s, r) => s + r.weight, 0),
      100,
    );
    assert.ok(rows.every((r) => r.result === 'ok'));
  });

  it('critério booleano falho → falha (ex.: "valor difere")', () => {
    const rows = criteriaBreakdown({ ...base, payeeMatch: true });
    assert.equal(find(rows, 'exactValue')?.result, 'falha'); // valor difere
    assert.equal(find(rows, 'payeeMatch')?.result, 'ok');
  });

  it('supplierOpen: 0→falha, 1→ok, >1→parcial; detalhe carrega a contagem', () => {
    assert.equal(
      find(criteriaBreakdown({ ...base, supplierOpenCount: 0 }), 'supplierOpen')?.result,
      'falha',
    );
    assert.equal(
      find(criteriaBreakdown({ ...base, supplierOpenCount: 1 }), 'supplierOpen')?.result,
      'ok',
    );
    const multi = find(criteriaBreakdown({ ...base, supplierOpenCount: 3 }), 'supplierOpen');
    assert.equal(multi?.result, 'parcial');
    assert.equal(multi?.detail, '3');
  });
});
