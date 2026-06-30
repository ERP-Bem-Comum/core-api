import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import { deactivateProgram } from '#src/modules/programs/application/use-cases/deactivate-program.ts';
import { reactivateProgram } from '#src/modules/programs/application/use-cases/reactivate-program.ts';
import { makeDeps } from './_support.ts';

const ABSENT_ID = '00000000-0000-4000-8000-000000000000';

type Deps = ReturnType<typeof makeDeps>;

const seed = async (deps: Deps) => {
  const r = await createProgram(deps)({
    name: 'Programa EPV',
    sigla: 'EPV',
    director: null,
    generalCharacteristics: null,
    logoKey: null,
  });
  assert.ok(isOk(r));
  return r.value.program;
};

describe('deactivateProgram', () => {
  it('ATIVO -> INATIVO + ProgramDeactivated', async () => {
    const deps = makeDeps();
    const p = await seed(deps);
    const r = await deactivateProgram(deps)({ programId: String(p.id) });
    assert.ok(isOk(r));
    assert.equal(r.value.program.status, 'INATIVO');
    assert.equal(r.value.event.type, 'ProgramDeactivated');
  });

  it('ja inativo -> program-not-active', async () => {
    const deps = makeDeps();
    const p = await seed(deps);
    const first = await deactivateProgram(deps)({ programId: String(p.id) });
    assert.ok(isOk(first));
    const again = await deactivateProgram(deps)({ programId: String(p.id) });
    assert.ok(isErr(again));
    assert.equal(again.error, 'program-not-active');
  });

  it('not-found', async () => {
    const r = await deactivateProgram(makeDeps())({ programId: ABSENT_ID });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-found');
  });
});

describe('reactivateProgram', () => {
  it('INATIVO -> ATIVO + ProgramReactivated', async () => {
    const deps = makeDeps();
    const p = await seed(deps);
    const d = await deactivateProgram(deps)({ programId: String(p.id) });
    assert.ok(isOk(d));
    const r = await reactivateProgram(deps)({ programId: String(p.id) });
    assert.ok(isOk(r));
    assert.equal(r.value.program.status, 'ATIVO');
    assert.equal(r.value.event.type, 'ProgramReactivated');
  });

  it('ja ativo -> program-not-inactive', async () => {
    const deps = makeDeps();
    const p = await seed(deps);
    const r = await reactivateProgram(deps)({ programId: String(p.id) });
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-inactive');
  });
});
