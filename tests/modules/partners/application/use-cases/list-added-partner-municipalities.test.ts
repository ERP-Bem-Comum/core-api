/**
 * PAR-GEO-ADDED-MUNICIPALITIES — W0 (RED) — use case cross-state dos municípios parceiros.
 *
 * DEVE FALHAR: `list-added-partner-municipalities.ts` ainda não existe. GREEN no W1.
 *
 * Lista os municípios marcados como parceiros de QUALQUER UF (status Active), resolvendo
 * `name` via catálogo IBGE; ignora os Inactive; ordena por nome.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryPartnerGeographyStore } from '#src/modules/partners/adapters/persistence/repos/partner-geography-repository.in-memory.ts';
import * as PartnerMunicipality from '#src/modules/partners/domain/geography/partner-municipality.ts';
import { listAddedPartnerMunicipalities } from '#src/modules/partners/application/use-cases/list-added-partner-municipalities.ts';

const SP = '3550308'; // São Paulo/SP
const RJ = '3304557'; // Rio de Janeiro/RJ
const NOW = new Date('2026-06-09T12:00:00.000Z');

const activate = (code: string) => {
  const r = PartnerMunicipality.activate(code);
  if (!r.ok) throw new Error(`activate ${code}: ${r.error}`);
  return r.value;
};

describe('listAddedPartnerMunicipalities', () => {
  it('lista os parceiros Active de qualquer UF, com uf e name resolvidos', async () => {
    const { repository } = makeInMemoryPartnerGeographyStore();
    await repository.saveMunicipality(activate(SP));
    await repository.saveMunicipality(activate(RJ));

    const result = await listAddedPartnerMunicipalities({ geographyRepo: repository })();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const codes = result.value.map((m) => m.ibgeCode as unknown as string);
    assert.equal(codes.includes(SP), true);
    assert.equal(codes.includes(RJ), true);
    for (const m of result.value) {
      assert.equal(typeof m.name, 'string');
      assert.equal(m.name.length > 0, true);
      assert.equal((m.uf as unknown as string).length, 2);
    }
  });

  it('ignora municípios Inactive (desativados)', async () => {
    const { repository } = makeInMemoryPartnerGeographyStore();
    await repository.saveMunicipality(activate(SP));
    await repository.saveMunicipality(PartnerMunicipality.deactivate(activate(RJ), NOW));

    const result = await listAddedPartnerMunicipalities({ geographyRepo: repository })();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const codes = result.value.map((m) => m.ibgeCode as unknown as string);
    assert.equal(codes.includes(SP), true);
    assert.equal(codes.includes(RJ), false);
  });

  it('ordena por nome', async () => {
    const { repository } = makeInMemoryPartnerGeographyStore();
    await repository.saveMunicipality(activate(SP));
    await repository.saveMunicipality(activate(RJ));

    const result = await listAddedPartnerMunicipalities({ geographyRepo: repository })();
    assert.equal(result.ok, true);
    if (!result.ok) return;
    const names = result.value.map((m) => m.name);
    assert.deepEqual(
      names,
      [...names].sort((a, b) => a.localeCompare(b)),
    );
  });

  it('lista vazia quando não há parceiros', async () => {
    const { repository } = makeInMemoryPartnerGeographyStore();
    const result = await listAddedPartnerMunicipalities({ geographyRepo: repository })();
    assert.equal(result.ok, true);
    if (result.ok) assert.deepEqual(result.value, []);
  });
});
