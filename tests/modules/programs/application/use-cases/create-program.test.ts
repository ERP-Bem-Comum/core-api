import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import { createProgram } from '#src/modules/programs/application/use-cases/create-program.ts';
import type { CreateProgramCommand } from '#src/modules/programs/application/use-cases/create-program.ts';
import { makeDeps } from './_support.ts';

const baseCmd = (over: Partial<CreateProgramCommand> = {}): CreateProgramCommand => ({
  name: 'Programa EPV',
  sigla: 'EPV',
  director: null,
  generalCharacteristics: null,
  logoKey: null,
  ...over,
});

describe('createProgram', () => {
  it('cria com sucesso (ATIVO, programNumber >= 1, ProgramCreated)', async () => {
    const r = await createProgram(makeDeps())(baseCmd());
    assert.ok(isOk(r));
    assert.equal(r.value.program.status, 'ATIVO');
    assert.equal(r.value.program.sigla, 'EPV');
    assert.ok(r.value.program.programNumber >= 1);
    assert.equal(r.value.event.type, 'ProgramCreated');
  });

  it('rejeita sigla duplicada (case-insensitive)', async () => {
    const deps = makeDeps();
    const first = await createProgram(deps)(baseCmd({ sigla: 'EPV' }));
    assert.ok(isOk(first));
    const dup = await createProgram(deps)(baseCmd({ sigla: 'epv' }));
    assert.ok(isErr(dup));
    assert.equal(dup.error, 'program-sigla-duplicated');
  });

  it('rejeita nome curto -> program-name-required', async () => {
    const r = await createProgram(makeDeps())(baseCmd({ name: 'A' }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-name-required');
  });

  it('rejeita sigla invalida -> program-sigla-invalid', async () => {
    const r = await createProgram(makeDeps())(baseCmd({ sigla: 'A B' }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-sigla-invalid');
  });
});
