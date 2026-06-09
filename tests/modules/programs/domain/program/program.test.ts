import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import { Program } from '#src/modules/programs/domain/program/program.ts';
import type {
  CreateProgramInput,
  UpdateProgramPatch,
} from '#src/modules/programs/domain/program/program.ts';

const NOW = new Date('2026-06-09T12:00:00.000Z');

const validInput = (over: Partial<CreateProgramInput> = {}): CreateProgramInput => ({
  id: ProgramId.generate(),
  programNumber: 1,
  name: 'Programa EPV',
  sigla: 'EPV',
  director: 'Vinicius Basilio',
  generalCharacteristics: 'Descricao do programa EPV',
  logoKey: null,
  now: NOW,
  ...over,
});

const patch = (over: Partial<UpdateProgramPatch> = {}): UpdateProgramPatch => ({
  name: 'Programa EPV',
  sigla: 'EPV',
  director: null,
  generalCharacteristics: null,
  logoKey: null,
  ...over,
});

const makeProgram = (over: Partial<CreateProgramInput> = {}) => {
  const r = Program.create(validInput(over));
  assert.ok(isOk(r));
  return r.value.program;
};

describe('Program.create', () => {
  it('CA2: input valido -> ATIVO version 1 + ProgramCreated', () => {
    const r = Program.create(validInput());
    assert.ok(isOk(r));
    assert.equal(r.value.program.status, 'ATIVO');
    assert.equal(r.value.program.version, 1);
    assert.equal(r.value.program.sigla, 'EPV');
    assert.equal(r.value.program.programNumber, 1);
    assert.equal(r.value.program.createdAt.getTime(), NOW.getTime());
    assert.equal(r.value.event.type, 'ProgramCreated');
    assert.equal(r.value.event.occurredAt.getTime(), NOW.getTime());
  });

  it('rejeita nome curto -> program-name-required', () => {
    const r = Program.create(validInput({ name: 'A' }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-name-required');
  });

  it('rejeita sigla invalida -> program-sigla-invalid', () => {
    const r = Program.create(validInput({ sigla: 'A B' }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-sigla-invalid');
  });

  it('normaliza sigla (lowercase -> upper)', () => {
    const r = Program.create(validInput({ sigla: 'parc' }));
    assert.ok(isOk(r));
    assert.equal(r.value.program.sigla, 'PARC');
  });
});

describe('Program.update', () => {
  it('CA3: atualiza, incrementa version, ProgramUpdated', () => {
    const p = makeProgram();
    const later = new Date(NOW.getTime() + 1000);
    const r = Program.update(p, patch({ name: 'Novo Nome', director: 'Outro' }), 1, later);
    assert.ok(isOk(r));
    assert.equal(r.value.program.name, 'Novo Nome');
    assert.equal(r.value.program.director, 'Outro');
    assert.equal(r.value.program.version, 2);
    assert.equal(r.value.program.updatedAt.getTime(), later.getTime());
    assert.equal(r.value.event.type, 'ProgramUpdated');
  });

  it('rejeita version divergente -> program-version-conflict', () => {
    const p = makeProgram();
    const r = Program.update(p, patch({ name: 'Outro Nome' }), 99, NOW);
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-version-conflict');
  });

  it('revalida nome curto na edicao', () => {
    const p = makeProgram();
    const r = Program.update(p, patch({ name: 'A' }), 1, NOW);
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-name-required');
  });
});

describe('Program.deactivate', () => {
  it('CA4: ATIVO -> INATIVO + ProgramDeactivated', () => {
    const p = makeProgram();
    const r = Program.deactivate(p, NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.program.status, 'INATIVO');
    assert.equal(r.value.program.version, 2);
    assert.equal(r.value.event.type, 'ProgramDeactivated');
  });

  it('rejeita desativar ja inativo -> program-not-active', () => {
    const d = Program.deactivate(makeProgram(), NOW);
    assert.ok(isOk(d));
    const again = Program.deactivate(d.value.program, NOW);
    assert.ok(isErr(again));
    assert.equal(again.error, 'program-not-active');
  });
});

describe('Program.reactivate', () => {
  it('CA5: INATIVO -> ATIVO + ProgramReactivated', () => {
    const d = Program.deactivate(makeProgram(), NOW);
    assert.ok(isOk(d));
    const r = Program.reactivate(d.value.program, NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.program.status, 'ATIVO');
    assert.equal(r.value.event.type, 'ProgramReactivated');
  });

  it('rejeita reativar ja ativo -> program-not-inactive', () => {
    const r = Program.reactivate(makeProgram(), NOW);
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-not-inactive');
  });
});

describe('Program.setLogo', () => {
  it('define logoKey, incrementa version, ProgramUpdated', () => {
    const r = Program.setLogo(makeProgram(), 'programs/x/logo', NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.program.logoKey, 'programs/x/logo');
    assert.equal(r.value.program.version, 2);
    assert.equal(r.value.event.type, 'ProgramUpdated');
  });

  it('aceita null (remove logo)', () => {
    const r = Program.setLogo(makeProgram(), null, NOW);
    assert.ok(isOk(r));
    assert.equal(r.value.program.logoKey, null);
  });
});
