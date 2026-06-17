/**
 * PAR-COLLABORATOR-TERRITORY (US3). VO `Territory` (uf validada vs catálogo; municipality livre).
 * DEVE FALHAR no W0: `domain/collaborator/territory.ts` ainda não existe. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Territory from '#src/modules/partners/domain/collaborator/territory.ts';

describe('Territory (VO US3)', () => {
  it('aceita UF válida + município', () => {
    const r = Territory.createTerritory({ uf: 'SP', municipality: 'São Paulo' });
    assert.ok(r.ok, `esperado ok: ${r.ok ? '' : r.error}`);
    if (r.ok) {
      assert.equal(r.value.uf, 'SP');
      assert.equal(r.value.municipality, 'São Paulo');
    }
  });

  it('aceita campos null (território não informado)', () => {
    const r = Territory.createTerritory({ uf: null, municipality: null });
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.uf, null);
      assert.equal(r.value.municipality, null);
    }
  });

  it('rejeita UF que não é sigla BR → territory-uf-invalid', () => {
    const r = Territory.createTerritory({ uf: 'XX', municipality: null });
    assert.ok(!r.ok);
    assert.equal(r.error, 'territory-uf-invalid');
  });
});
