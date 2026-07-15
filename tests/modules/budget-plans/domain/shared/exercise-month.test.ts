// BGP-MONTH-VO (#413) — W0 RED. VO ExerciseMonth: mês do exercício do plano (1..12).
// O FR-005 exige rejeitar mês fora do exercício, e a regra é de DOMÍNIO — daí o VO com smart
// constructor + branded type, não `number` cru (domain.md §"Branded types"). Zero throw: todo
// caminho de erro devolve Result (domain.md §"throw proibido").
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';

describe('ExerciseMonth.parse — faixa do exercício (CA1/CA2)', () => {
  it('aceita os 12 meses do exercício', () => {
    for (const raw of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      const r = ExerciseMonth.parse(raw);
      assert.equal(r.ok, true, `mês ${raw} deveria ser válido`);
      if (r.ok) assert.equal(r.value, raw);
    }
  });

  it('rejeita mês fora de 1..12 → exercise-month-invalid', () => {
    for (const raw of [0, 13, -1, 99]) {
      const r = ExerciseMonth.parse(raw);
      assert.equal(r.ok, false, `mês ${raw} deveria ser inválido`);
      if (!r.ok) assert.equal(r.error, 'exercise-month-invalid');
    }
  });

  it('rejeita não-inteiro → exercise-month-invalid (mês é ordinal, não fração)', () => {
    const r = ExerciseMonth.parse(3.5);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'exercise-month-invalid');
  });

  it('rejeita NaN e Infinity sem lançar → exercise-month-invalid', () => {
    for (const raw of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const r = ExerciseMonth.parse(raw);
      assert.equal(r.ok, false, `${String(raw)} deveria ser inválido`);
      if (!r.ok) assert.equal(r.error, 'exercise-month-invalid');
    }
  });
});

describe('ExerciseMonth.rehydrate — row → domínio (CA6)', () => {
  it('reidrata valor válido vindo do banco', () => {
    const r = ExerciseMonth.rehydrate(7);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, 7);
  });

  // O domínio rejeita estado inválido vindo do banco (adapters.md §"mappers devolvem Result").
  // Blinda contra row corrompida mesmo com o CHECK do MySQL no lugar.
  it('row fora de 1..12 → exercise-month-invalid (não confia no banco)', () => {
    for (const raw of [0, 13, -5, 2.5]) {
      const r = ExerciseMonth.rehydrate(raw);
      assert.equal(r.ok, false, `row com mês ${raw} deveria ser rejeitada`);
      if (!r.ok) assert.equal(r.error, 'exercise-month-invalid');
    }
  });
});
