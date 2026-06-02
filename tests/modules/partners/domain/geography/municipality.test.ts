import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as State from '#src/modules/partners/domain/geography/state.ts';
import * as Municipality from '#src/modules/partners/domain/geography/municipality.ts';

const SAO_PAULO_COD = '3550308';

describe('IbgeCode — module-as-namespace (Padrão D)', () => {
  it('expõe parse/list/find e NÃO expõe generate', () => {
    const ns: Readonly<Record<string, unknown>> = Municipality;
    assert.equal(typeof ns.parse, 'function');
    assert.equal(typeof ns.listMunicipalities, 'function');
    assert.equal(typeof ns.findMunicipalityByCod, 'function');
    assert.equal(typeof ns.listMunicipalitiesByUf, 'function');
    assert.equal(ns.generate, undefined);
  });
});

describe('IbgeCode — parse', () => {
  it('aceita código de 7 dígitos', () => {
    const r = Municipality.parse(SAO_PAULO_COD);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value as unknown as string, SAO_PAULO_COD);
  });

  it('rejeita comprimento != 7, não-dígitos e vazio', () => {
    for (const bad of ['123', '35503080', 'abcdefg', '']) {
      const r = Municipality.parse(bad);
      assert.equal(isErr(r), true, `deveria rejeitar ${JSON.stringify(bad)}`);
      if (!r.ok) assert.equal(r.error, 'invalid-ibge-code');
    }
  });
});

describe('catálogo de municípios', () => {
  it('listMunicipalities retorna o universo IBGE (~5570)', () => {
    const all = Municipality.listMunicipalities();
    assert.ok(all.length >= 5570, `esperava >= 5570, veio ${String(all.length)}`);
  });

  it('findMunicipalityByCod resolve São Paulo com UF SP', () => {
    const r = Municipality.findMunicipalityByCod(SAO_PAULO_COD);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.name, 'São Paulo');
      assert.equal(r.value.uf as unknown as string, 'SP');
    }
  });

  it('findMunicipalityByCod rejeita código inexistente bem-formado', () => {
    const r = Municipality.findMunicipalityByCod('9999999');
    assert.equal(isErr(r), true);
  });

  it('listMunicipalitiesByUf filtra por UF e rejeita UF inexistente', () => {
    const sp = Municipality.listMunicipalitiesByUf('SP');
    assert.equal(isOk(sp), true);
    if (sp.ok) {
      assert.ok(sp.value.length > 0);
      assert.ok(sp.value.every((m) => (m.uf as unknown as string) === 'SP'));
    }
    assert.equal(isErr(Municipality.listMunicipalitiesByUf('XX')), true);
  });

  it('INTEGRIDADE: toda UF do catálogo é uma StateAbbreviation válida', () => {
    const ufs = new Set(Municipality.listMunicipalities().map((m) => m.uf as unknown as string));
    for (const uf of ufs) {
      assert.equal(isOk(State.parse(uf)), true, `UF inválida no catálogo: ${uf}`);
    }
    // o catálogo cobre todas as 27 UFs
    assert.equal(ufs.size, 27);
  });
});
