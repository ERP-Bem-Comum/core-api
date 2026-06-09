import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import { getProgram } from '#src/modules/programs/application/use-cases/get-program.ts';
import { makeDeps } from './_support.ts';

const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

describe('getProgram', () => {
  it('retorna o programa existente', async () => {
    const deps = makeDeps();
    const created = await createProgram(deps)({
      name: 'Programa EPV',
      sigla: 'EPV',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
    });
    assert.ok(isOk(created));
    const r = await getProgram(deps)({ programId: String(created.value.program.id) });
    assert.ok(isOk(r));
    assert.equal(r.value.program.sigla, 'EPV');
  });

  it('id inexistente -> program-not-found', async () => {
    const r = await getProgram(makeDeps())({ programId: ABSENT_ID });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-found');
  });

  it('id invalido -> program-not-found (fail-closed)', async () => {
    const r = await getProgram(makeDeps())({ programId: 'nao-e-uuid' });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-found');
  });
});
