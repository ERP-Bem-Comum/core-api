// BDG-COST-STRUCTURE (#316) — W0 RED. VO LaunchType: os 4 modelos de lançamento (compartilhado com US3/#317).
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as LaunchType from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';

describe('LaunchType — 4 modelos do legado (SubCategoryReleaseType)', () => {
  it('aceita IPCA / CAED / DESPESAS_PESSOAIS / DESPESAS_LOGISTICAS', () => {
    for (const v of ['IPCA', 'CAED', 'DESPESAS_PESSOAIS', 'DESPESAS_LOGISTICAS']) {
      const r = LaunchType.parse(v);
      assert.equal(r.ok, true, `${v} deveria ser válido`);
    }
  });

  it('rejeita valor fora do enum e vazio', () => {
    assert.equal(LaunchType.parse('OUTRO').ok, false);
    assert.equal(LaunchType.parse('ipca').ok, false); // case-sensitive (valor de fio do legado)
    assert.equal(LaunchType.parse('').ok, false);
  });
});
