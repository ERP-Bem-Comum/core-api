/**
 * PARTNERS-GEO-READ-DEGRADE — W0 (RED) — mapeamento degrada por linha, não aborta a lista.
 *
 * Alvo: `geography-read.drizzle.ts`. Hoje uma linha órfã (uf/ibgeCode fora do catálogo IBGE)
 * faz `stateToView`/`municipalityToView` devolverem `err` e o loop **abortar a lista inteira**
 * → 503 em `/budget-plans/options` → dropdowns de Estado/Município vazios no modal.
 *
 * RED-by-inexistence: os mappers puros `mapStateRows`/`mapMunicipalityRows` ainda não existem
 * (a lógica está acoplada ao store, intestável sem banco). O import estático falha até o W1.
 *
 * Cobertura: CA1 (estado órfão → fallback sigla, lista intacta), CA2 (município órfão → omitido,
 * lista intacta), CA3 (caminho feliz).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  mapStateRows,
  mapMunicipalityRows,
} from '#src/modules/partners/adapters/persistence/repos/geography-read.drizzle.ts';
import type {
  StateRow,
  MunicipalityRow,
} from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-07-22T00:00:00.000Z');

const stateRow = (uf: string): StateRow => ({
  uf,
  active: true,
  deactivatedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
});

const municipalityRow = (ibgeCode: string, uf: string): MunicipalityRow => ({
  ibgeCode,
  uf,
  active: true,
  deactivatedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
});

// ─── CA1 — estado órfão não derruba a lista (fallback de sigla) ──────────────
describe('mapStateRows — CA1 (órfã não aborta; fallback sigla)', () => {
  it('[CE válido, XX órfão] → ambos aparecem; XX cai no fallback name=uf', () => {
    const views = mapStateRows([stateRow('CE'), stateRow('XX')]);

    assert.equal(views.length, 2, 'a lista NÃO pode ser abortada por uma linha órfã');

    const ce = views.find((v) => v.ref === 'CE');
    assert.ok(ce, 'CE (válido) deve aparecer');
    assert.equal(ce.name, 'Ceará', 'CE hidrata o nome do catálogo IBGE');

    const xx = views.find((v) => v.ref === 'XX');
    assert.ok(xx, 'XX (órfão) NÃO some — degrada por linha');
    assert.equal(xx.name, 'XX', 'órfão cai no fallback de sigla (name = uf)');
    assert.equal(xx.uf, 'XX');
  });
});

// ─── CA2 — município órfão é omitido, não aborta a lista ─────────────────────
describe('mapMunicipalityRows — CA2 (órfã omitida; lista intacta)', () => {
  it('[2304400 Fortaleza válido, 9999999 órfão] → só o válido; órfão omitido', () => {
    const views = mapMunicipalityRows([
      municipalityRow('2304400', 'CE'),
      municipalityRow('9999999', 'CE'),
    ]);

    assert.equal(views.length, 1, 'órfão é omitido, mas a lista NÃO é abortada');
    assert.equal(views[0]?.ref, '2304400');
    assert.equal(views[0]?.name, 'Fortaleza');
    assert.equal(
      views.some((v) => v.ref === '9999999'),
      false,
      'ibgeCode fora do catálogo não aparece (sem nome para exibir)',
    );
  });
});

// ─── CA3 — caminho feliz (sem regressão) ────────────────────────────────────
describe('geography mappers — CA3 (caminho feliz)', () => {
  it('todos os estados válidos aparecem com nome do catálogo', () => {
    const views = mapStateRows([stateRow('CE'), stateRow('RN')]);
    assert.equal(views.length, 2);
    assert.equal(views.find((v) => v.ref === 'RN')?.name, 'Rio Grande do Norte');
  });

  it('lista vazia → vazia', () => {
    assert.deepEqual(mapStateRows([]), []);
    assert.deepEqual(mapMunicipalityRows([]), []);
  });
});
