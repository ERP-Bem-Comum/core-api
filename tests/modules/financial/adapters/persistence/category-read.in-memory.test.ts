import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (020 · US1): o read store in-memory ainda não existe.
// `CategoryReadPort.list()` (data-model.md:39) retorna só `active=true`, ordenado por (group, name),
// com `group` presente — base para o select agrupado do protótipo (FR-004/005/006/007).
import * as Category from '#src/modules/financial/domain/category/category.ts';
import * as CategoryId from '#src/modules/financial/domain/category/category-id.ts';
import { createInMemoryCategoryReadStore } from '#src/modules/financial/adapters/persistence/repos/category-read.in-memory.ts';

const mk = (name: string, group: string, active: boolean): Category.Category => {
  const r = Category.create({ id: CategoryId.generate(), name, group, active });
  if (!r.ok) throw new Error(`fixture inválida: ${r.error}`);
  return r.value;
};

describe('financial/adapters — category-read in-memory', () => {
  it('list() omite inativos e mantém os ativos (FR-006/007)', async () => {
    const store = createInMemoryCategoryReadStore([
      mk('Aluguel', 'despesa', true),
      mk('Multa rescisória', 'despesa', false),
      mk('Doações', 'receita', true),
    ]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.length, 2);
      assert.equal(
        r.value.every((c) => c.active),
        true,
      );
    }
  });

  it('list() ordena por (group, name) — determinístico (FR-004/005)', async () => {
    const store = createInMemoryCategoryReadStore([
      mk('Tarifa bancária', 'despesa', true),
      mk('Aluguel', 'despesa', true),
      mk('Doações', 'receita', true),
    ]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(
        r.value.map((c) => `${c.group}/${c.name}`),
        ['despesa/Aluguel', 'despesa/Tarifa bancária', 'receita/Doações'],
      );
    }
  });

  it('lista vazia → ok([]) sem erro (FR-007)', async () => {
    const store = createInMemoryCategoryReadStore([]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, []);
  });
});
