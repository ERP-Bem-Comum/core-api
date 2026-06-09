import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk } from '#src/shared/index.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import { listPrograms } from '#src/modules/programs/application/use-cases/list-programs.ts';
import { makeDeps } from './_support.ts';

describe('listPrograms', () => {
  it('deriva meta de paginacao (totalItems/totalPages)', async () => {
    const deps = makeDeps();
    for (let i = 0; i < 7; i++) {
      const r = await createProgram(deps)({
        name: `Programa ${i}`,
        sigla: `S${i}A`,
        director: null,
        generalCharacteristics: null,
        logoKey: null,
      });
      assert.ok(isOk(r));
    }
    const page = await listPrograms(deps)({ page: 1, limit: 5, order: 'ASC' });
    assert.ok(isOk(page));
    assert.equal(page.value.items.length, 5);
    assert.equal(page.value.meta.totalItems, 7);
    assert.equal(page.value.meta.totalPages, 2);
    assert.equal(page.value.meta.currentPage, 1);
    assert.equal(page.value.meta.itemsPerPage, 5);
    assert.equal(page.value.meta.itemCount, 5);
  });

  it('lista vazia -> meta zerada, sem erro', async () => {
    const r = await listPrograms(makeDeps())({ page: 1, limit: 5, order: 'ASC' });
    assert.ok(isOk(r));
    assert.equal(r.value.items.length, 0);
    assert.equal(r.value.meta.totalItems, 0);
    assert.equal(r.value.meta.totalPages, 0);
  });

  it('busca por nome/sigla (case-insensitive)', async () => {
    const deps = makeDeps();
    await createProgram(deps)({
      name: 'Educacao',
      sigla: 'EPV',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
    });
    await createProgram(deps)({
      name: 'Parcerias',
      sigla: 'PARC',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
    });
    const r = await listPrograms(deps)({ page: 1, limit: 10, order: 'ASC', search: 'parc' });
    assert.ok(isOk(r));
    assert.equal(r.value.items.length, 1);
    assert.equal(r.value.items[0]?.sigla, 'PARC');
  });
});
