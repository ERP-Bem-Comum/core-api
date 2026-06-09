import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import * as Sigla from '#src/modules/programs/domain/program/sigla.ts';

describe('Sigla.create', () => {
  it('CA1: normaliza trim + uppercase', () => {
    const r = Sigla.create('  epv  ');
    assert.ok(isOk(r));
    assert.equal(r.value, 'EPV');
  });

  it('aceita 2-20 alfanumerico', () => {
    assert.ok(isOk(Sigla.create('PARC')));
    assert.ok(isOk(Sigla.create('A1')));
    assert.ok(isOk(Sigla.create('ABCDEFGHIJ1234567890')));
  });

  it('rejeita espaco interno', () => {
    const r = Sigla.create('A B');
    assert.ok(isErr(r));
    assert.equal(r.error, 'program-sigla-invalid');
  });

  it('rejeita caractere especial', () => {
    assert.ok(isErr(Sigla.create('A&B')));
  });

  it('rejeita menos de 2 chars', () => {
    assert.ok(isErr(Sigla.create('A')));
  });

  it('rejeita mais de 20 chars', () => {
    assert.ok(isErr(Sigla.create('A'.repeat(21))));
  });

  it('rejeita vazio/branco', () => {
    assert.ok(isErr(Sigla.create('   ')));
  });
});
