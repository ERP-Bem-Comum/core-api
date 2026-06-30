/**
 * Testes do adapter InMemory do PartnerGeographyRepository (US-002).
 * Cobre saveState/findStateByUf/listStates e saveMunicipality/findMunicipalityByCode/listMunicipalities.
 * Roda em `pnpm test` (sem MySQL).
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryPartnerGeographyStore } from '#src/modules/partners/adapters/persistence/repos/partner-geography-repository.in-memory.ts';
import * as PartnerState from '#src/modules/partners/domain/geography/partner-state.ts';
import * as PartnerMunicipality from '#src/modules/partners/domain/geography/partner-municipality.ts';

const NOW = new Date('2026-01-10T12:00:00.000Z');

const buildActiveState = (uf: string): ReturnType<typeof PartnerState.activate> =>
  PartnerState.activate(uf);

const buildActiveMunicipality = (
  ibgeCode: string,
): ReturnType<typeof PartnerMunicipality.activate> => PartnerMunicipality.activate(ibgeCode);

describe('makeInMemoryPartnerGeographyStore — states', () => {
  let store: ReturnType<typeof makeInMemoryPartnerGeographyStore>;

  beforeEach(() => {
    store = makeInMemoryPartnerGeographyStore();
  });

  it('findStateByUf de UF ausente → ok(null)', async () => {
    const r = await store.repository.findStateByUf('SP');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value, null);
  });

  it('saveState + findStateByUf → ok(state)', async () => {
    const parsed = buildActiveState('SP');
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const saved = await store.repository.saveState(parsed.value);
    assert.equal(saved.ok, true);

    const found = await store.repository.findStateByUf('SP');
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.ok(found.value !== null);
    assert.equal(found.value.uf as unknown as string, 'SP');
    assert.equal(found.value.status, 'Active');
  });

  it('saveState é upsert — segunda save sobrescreve', async () => {
    const active = buildActiveState('RJ');
    assert.equal(active.ok, true);
    if (!active.ok) return;

    await store.repository.saveState(active.value);
    const inactive = PartnerState.deactivate(active.value, NOW);
    await store.repository.saveState(inactive);

    const found = await store.repository.findStateByUf('RJ');
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.ok(found.value !== null);
    assert.equal(found.value.status, 'Inactive');
  });

  it('listStates retorna todos os estados persistidos', async () => {
    const sp = buildActiveState('SP');
    const mg = buildActiveState('MG');
    assert.equal(sp.ok, true);
    assert.equal(mg.ok, true);
    if (!sp.ok || !mg.ok) return;

    await store.repository.saveState(sp.value);
    await store.repository.saveState(mg.value);

    const all = await store.repository.listStates();
    assert.equal(all.ok, true);
    if (!all.ok) return;
    assert.equal(all.value.length, 2);
  });

  it('clear() limpa o store', async () => {
    const sp = buildActiveState('SP');
    assert.equal(sp.ok, true);
    if (!sp.ok) return;
    await store.repository.saveState(sp.value);

    store.clear();

    const all = await store.repository.listStates();
    assert.equal(all.ok, true);
    if (!all.ok) return;
    assert.equal(all.value.length, 0);
  });
});

describe('makeInMemoryPartnerGeographyStore — municipalities', () => {
  let store: ReturnType<typeof makeInMemoryPartnerGeographyStore>;

  // Código IBGE válido de São Paulo (SP) — 7 dígitos
  const SP_IBGE = '3550308';
  // Código IBGE válido de Rio de Janeiro (RJ)
  const RJ_IBGE = '3304557';

  beforeEach(() => {
    store = makeInMemoryPartnerGeographyStore();
  });

  it('findMunicipalityByCode de código ausente → ok(null)', async () => {
    const r = await store.repository.findMunicipalityByCode(SP_IBGE);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value, null);
  });

  it('saveMunicipality + findMunicipalityByCode → ok(municipality)', async () => {
    const parsed = buildActiveMunicipality(SP_IBGE);
    assert.equal(parsed.ok, true);
    if (!parsed.ok) return;

    const saved = await store.repository.saveMunicipality(parsed.value);
    assert.equal(saved.ok, true);

    const found = await store.repository.findMunicipalityByCode(SP_IBGE);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.ok(found.value !== null);
    assert.equal(found.value.ibgeCode as unknown as string, SP_IBGE);
    assert.equal(found.value.status, 'Active');
  });

  it('saveMunicipality é upsert — segunda save sobrescreve', async () => {
    const active = buildActiveMunicipality(RJ_IBGE);
    assert.equal(active.ok, true);
    if (!active.ok) return;

    await store.repository.saveMunicipality(active.value);
    const inactive = PartnerMunicipality.deactivate(active.value, NOW);
    await store.repository.saveMunicipality(inactive);

    const found = await store.repository.findMunicipalityByCode(RJ_IBGE);
    assert.equal(found.ok, true);
    if (!found.ok) return;
    assert.ok(found.value !== null);
    assert.equal(found.value.status, 'Inactive');
  });

  it('listMunicipalities retorna todos os municípios persistidos', async () => {
    const sp = buildActiveMunicipality(SP_IBGE);
    const rj = buildActiveMunicipality(RJ_IBGE);
    assert.equal(sp.ok, true);
    assert.equal(rj.ok, true);
    if (!sp.ok || !rj.ok) return;

    await store.repository.saveMunicipality(sp.value);
    await store.repository.saveMunicipality(rj.value);

    const all = await store.repository.listMunicipalities();
    assert.equal(all.ok, true);
    if (!all.ok) return;
    assert.equal(all.value.length, 2);
  });
});
