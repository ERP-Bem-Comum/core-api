import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as State from '#src/modules/partners/domain/geography/state.ts';

describe('StateAbbreviation — module-as-namespace (Padrão D)', () => {
  it('expõe `parse`/`listStates`/`findStateByAbbreviation` e NÃO expõe `generate`', () => {
    const ns: Readonly<Record<string, unknown>> = State;
    assert.equal(typeof ns.parse, 'function');
    assert.equal(typeof ns.listStates, 'function');
    assert.equal(typeof ns.findStateByAbbreviation, 'function');
    assert.equal(ns.generate, undefined);
  });
});

describe('StateAbbreviation — parse', () => {
  it('aceita UF válida', () => {
    const r = State.parse('SP');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, 'SP');
  });

  it('normaliza minúsculas e espaços para 2 letras maiúsculas', () => {
    for (const raw of ['sp', ' sp ', 'Sp']) {
      const r = State.parse(raw);
      assert.equal(isOk(r), true, `falhou para ${JSON.stringify(raw)}`);
      if (r.ok) assert.equal(r.value as unknown as string, 'SP');
    }
  });

  it('rejeita sigla bem-formada mas inexistente', () => {
    const r = State.parse('XX');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-state');
  });

  it('rejeita comprimento != 2 e vazio', () => {
    assert.equal(isErr(State.parse('S')), true);
    assert.equal(isErr(State.parse('SAO')), true);
    assert.equal(isErr(State.parse('')), true);
  });
});

describe('catálogo de UFs', () => {
  it('listStates retorna exatamente 27 UFs ordenadas por sigla', () => {
    const states = State.listStates();
    assert.equal(states.length, 27);
    const siglas = states.map((s) => s.abbreviation as unknown as string);
    const ordered = [...siglas].sort((a, b) => a.localeCompare(b));
    assert.deepEqual(siglas, ordered);
    // inclui DF (Distrito Federal) além dos 26 estados
    assert.ok(siglas.includes('DF'));
  });

  it('findStateByAbbreviation resolve sigla válida com nome em PT', () => {
    const r = State.findStateByAbbreviation('SP');
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.name, 'São Paulo');
  });

  it('findStateByAbbreviation aceita minúscula e rejeita inexistente', () => {
    const ok = State.findStateByAbbreviation('rj');
    assert.equal(isOk(ok), true);
    if (ok.ok) assert.equal(ok.value.name, 'Rio de Janeiro');
    assert.equal(isErr(State.findStateByAbbreviation('XX')), true);
  });
});
