import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (020-fin-categorization-ref · US1): o domínio Category ainda não existe.
// Smart constructor (data-model.md:13) valida `name` (1..120) e `group` ∈ {despesa,receita,ajuste}
// (D3 / research.md:18-21 — union EN-fechada, espelha o VO `entry-type` do statement #159).
import * as Category from '#src/modules/financial/domain/category/category.ts';
import * as CategoryId from '#src/modules/financial/domain/category/category-id.ts';

const GROUPS = ['despesa', 'receita', 'ajuste'] as const;

describe('financial/domain/category — smart constructor', () => {
  it('CA1: cria categoria válida para cada group ∈ {despesa,receita,ajuste}', () => {
    for (const group of GROUPS) {
      const r = Category.create({
        id: CategoryId.generate(),
        name: 'Aluguel',
        group,
        active: true,
      });
      assert.equal(r.ok, true, group);
      if (r.ok) {
        assert.equal(r.value.group, group);
        assert.equal(r.value.name, 'Aluguel');
        assert.equal(r.value.active, true);
      }
    }
  });

  it('group fora do union → category-group-invalid', () => {
    const r = Category.create({
      id: CategoryId.generate(),
      name: 'Investimento',
      group: 'investimento',
      active: true,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'category-group-invalid');
  });

  it('name vazio/só espaços → category-name-empty', () => {
    for (const name of ['', '   ']) {
      const r = Category.create({
        id: CategoryId.generate(),
        name,
        group: 'despesa',
        active: true,
      });
      assert.equal(r.ok, false, JSON.stringify(name));
      if (!r.ok) assert.equal(r.error, 'category-name-empty');
    }
  });

  it('active assume true quando omitido (item de referência nasce ativo)', () => {
    const r = Category.create({ id: CategoryId.generate(), name: 'Doações', group: 'receita' });
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.active, true);
  });
});
