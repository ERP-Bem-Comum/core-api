/**
 * PARTNERS-TERRITORY — W1 — Entity PartnerMunicipality (soft-delete, ADR-0001 da feature).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PartnerMunicipality from '#src/modules/partners/domain/geography/partner-municipality.ts';

const NOW = new Date('2026-06-06T12:00:00.000Z');
// Código IBGE de São Paulo (SP): 3550308
const SP_IBGE = '3550308';
// Código IBGE de Manaus (AM): 1302603
const AM_IBGE = '1302603';
// Código inexistente
const INVALID_IBGE = '9999999';

describe('PartnerMunicipality — Entity com soft-delete', () => {
  it('activate cria parceria Active para código IBGE válido e carrega uf', () => {
    const r = PartnerMunicipality.activate(SP_IBGE);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(String(r.value.ibgeCode), SP_IBGE);
    assert.equal(r.value.status, 'Active');
    assert.equal(String(r.value.uf), 'SP');
  });

  it('activate carrega uf correta para município de AM', () => {
    const r = PartnerMunicipality.activate(AM_IBGE);
    assert.ok(r.ok);
    if (!r.ok) return;
    assert.equal(String(r.value.uf), 'AM');
  });

  it('activate rejeita código IBGE fora do catálogo', () => {
    const r = PartnerMunicipality.activate(INVALID_IBGE);
    assert.equal(r.ok, false);
  });

  it('activate rejeita string com formato errado (não 7 dígitos)', () => {
    const r = PartnerMunicipality.activate('123');
    assert.equal(r.ok, false);
  });

  it('deactivate: Active → Inactive carrega deactivatedAt (soft-delete)', () => {
    const a = PartnerMunicipality.activate(SP_IBGE);
    assert.ok(a.ok);
    if (!a.ok) return;
    const d = PartnerMunicipality.deactivate(a.value, NOW);
    assert.equal(d.status, 'Inactive');
    if (d.status === 'Inactive') assert.deepEqual(d.deactivatedAt, NOW);
  });

  it('deactivate é idempotente: Inactive permanece Inactive', () => {
    const a = PartnerMunicipality.activate(SP_IBGE);
    assert.ok(a.ok);
    if (!a.ok) return;
    const d1 = PartnerMunicipality.deactivate(a.value, NOW);
    const d2 = PartnerMunicipality.deactivate(d1, new Date());
    assert.equal(d2.status, 'Inactive');
    assert.deepEqual(d2.deactivatedAt, NOW); // preserva o primeiro timestamp
  });

  it('reactivate: Inactive → Active (sem deactivatedAt)', () => {
    const a = PartnerMunicipality.activate(SP_IBGE);
    assert.ok(a.ok);
    if (!a.ok) return;
    const d = PartnerMunicipality.deactivate(a.value, NOW);
    const r = PartnerMunicipality.reactivate(d);
    assert.equal(r.status, 'Active');
    assert.ok(!('deactivatedAt' in r));
  });

  it('reactivate é idempotente: Active permanece Active', () => {
    const a = PartnerMunicipality.activate(SP_IBGE);
    assert.ok(a.ok);
    if (!a.ok) return;
    const r = PartnerMunicipality.reactivate(a.value);
    assert.equal(r.status, 'Active');
  });
});
