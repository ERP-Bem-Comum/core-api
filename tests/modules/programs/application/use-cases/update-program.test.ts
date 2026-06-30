import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import type { CreateProgramCommand } from '#src/modules/programs/application/use-cases/create-program.ts';
import { updateProgram } from '#src/modules/programs/application/use-cases/update-program.ts';
import { makeDeps } from './_support.ts';

const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

type Deps = ReturnType<typeof makeDeps>;

const seed = async (deps: Deps, over: Partial<CreateProgramCommand> = {}) => {
  const r = await createProgram(deps)({
    name: 'Programa EPV',
    sigla: 'EPV',
    director: null,
    generalCharacteristics: null,
    logoKey: null,
    ...over,
  });
  assert.ok(isOk(r));
  return r.value.program;
};

describe('updateProgram', () => {
  it('atualiza nome e incrementa version (1 -> 2)', async () => {
    const deps = makeDeps();
    const p = await seed(deps);
    const r = await updateProgram(deps)({
      programId: String(p.id),
      name: 'Novo Nome',
      sigla: 'EPV',
      director: 'Diretor',
      generalCharacteristics: null,
      logoKey: null,
      version: 1,
    });
    assert.ok(isOk(r));
    assert.equal(r.value.program.name, 'Novo Nome');
    assert.equal(r.value.program.version, 2);
    assert.equal(r.value.event.type, 'ProgramUpdated');
  });

  it('version obsoleta -> program-version-conflict', async () => {
    const deps = makeDeps();
    const p = await seed(deps);
    const r = await updateProgram(deps)({
      programId: String(p.id),
      name: 'Qualquer',
      sigla: 'EPV',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
      version: 99,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-version-conflict');
  });

  it('id inexistente -> program-not-found', async () => {
    const r = await updateProgram(makeDeps())({
      programId: ABSENT_ID,
      name: 'Programa',
      sigla: 'AAA',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
      version: 1,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-found');
  });

  it('sigla de OUTRO programa -> program-sigla-duplicated', async () => {
    const deps = makeDeps();
    await seed(deps, { sigla: 'PARC', name: 'Parcerias' });
    const epv = await seed(deps, { sigla: 'EPV', name: 'Educacao' });
    const r = await updateProgram(deps)({
      programId: String(epv.id),
      name: 'Educacao',
      sigla: 'PARC',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
      version: 1,
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-sigla-duplicated');
  });

  it('manter a propria sigla NAO e duplicidade', async () => {
    const deps = makeDeps();
    const p = await seed(deps, { sigla: 'EPV' });
    const r = await updateProgram(deps)({
      programId: String(p.id),
      name: 'Outro Nome',
      sigla: 'EPV',
      director: null,
      generalCharacteristics: null,
      logoKey: null,
      version: 1,
    });
    assert.ok(isOk(r));
  });
});
