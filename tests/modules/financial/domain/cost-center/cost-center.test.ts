import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (020-fin-categorization-ref · US2): o domínio CostCenter ainda não existe.
// Smart constructor (data-model.md:25) valida `code` e `name` não-vazios. Sem `group` (≠ Category).
import * as CostCenter from '#src/modules/financial/domain/cost-center/cost-center.ts';
import * as CostCenterId from '#src/modules/financial/domain/cost-center/cost-center-id.ts';

describe('financial/domain/cost-center — smart constructor', () => {
  it('CA1: cria centro de custo válido (code + name)', () => {
    const r = CostCenter.create({
      id: CostCenterId.generate(),
      code: 'CC-001',
      name: 'Administrativo',
      active: true,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.code, 'CC-001');
      assert.equal(r.value.name, 'Administrativo');
      assert.equal(r.value.active, true);
    }
  });

  it('code vazio/só espaços → cost-center-code-empty', () => {
    for (const code of ['', '   ']) {
      const r = CostCenter.create({
        id: CostCenterId.generate(),
        code,
        name: 'Administrativo',
        active: true,
      });
      assert.equal(r.ok, false, JSON.stringify(code));
      if (!r.ok) assert.equal(r.error, 'cost-center-code-empty');
    }
  });

  it('name vazio/só espaços → cost-center-name-empty', () => {
    const r = CostCenter.create({
      id: CostCenterId.generate(),
      code: 'CC-002',
      name: '   ',
      active: true,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cost-center-name-empty');
  });

  it('active assume true quando omitido (item de referência nasce ativo)', () => {
    const r = CostCenter.create({
      id: CostCenterId.generate(),
      code: 'CC-003',
      name: 'Programa Saúde',
    });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.active, true);
  });
});
