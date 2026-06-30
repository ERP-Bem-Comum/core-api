import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED (020-fin-categorization-ref · US3): o read store in-memory ainda não existe.
// `ProgramReadPort.list()` (data-model.md:41) devolve a projeção `{ id, name }` (stub seedado).
import { createInMemoryProgramReadStore } from '#src/modules/financial/adapters/persistence/repos/program-read.in-memory.ts';

describe('financial/adapters — program-read in-memory', () => {
  it('list() retorna a projeção {id,name} dos programas seedados', async () => {
    const store = createInMemoryProgramReadStore([
      { id: '7b000000-0000-4000-8000-000000000001', name: 'Saúde Comunitária' },
      { id: '7b000000-0000-4000-8000-000000000002', name: 'Educação Infantil' },
    ]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.length, 2);
      for (const p of r.value) {
        assert.equal(typeof p.id, 'string');
        assert.ok(p.name.length > 0);
      }
    }
  });

  it('lista vazia → ok([]) sem erro (FR-007)', async () => {
    const store = createInMemoryProgramReadStore([]);
    const r = await store.list();
    assert.equal(r.ok, true);
    if (r.ok) assert.deepEqual(r.value, []);
  });
});
