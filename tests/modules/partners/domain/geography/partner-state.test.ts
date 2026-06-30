/**
 * PARTNERS-TERRITORY — W0 (RED) — Entity PartnerState (soft-delete; ADR-0001 da feature).
 * DEVE FALHAR: o módulo de domínio ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PartnerState from '#src/modules/partners/domain/geography/partner-state.ts';

const NOW = new Date('2026-06-06T12:00:00.000Z');

describe('PartnerState — Entity com soft-delete', () => {
  it('activate cria parceria Active para UF válida', () => {
    const r = PartnerState.activate('SP');
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(String(r.value.uf), 'SP');
    assert.equal(r.value.status, 'Active');
  });

  it('activate rejeita UF fora do catálogo', () => {
    const r = PartnerState.activate('XX');
    assert.equal(r.ok, false);
  });

  it('deactivate: Active → Inactive carrega deactivatedAt (soft-delete)', () => {
    const a = PartnerState.activate('SP');
    assert.ok(a.ok);
    if (!a.ok) return;
    const d = PartnerState.deactivate(a.value, NOW);
    assert.equal(d.status, 'Inactive');
    if (d.status === 'Inactive') assert.deepEqual(d.deactivatedAt, NOW);
  });

  it('reactivate: Inactive → Active (sem deactivatedAt)', () => {
    const a = PartnerState.activate('SP');
    assert.ok(a.ok);
    if (!a.ok) return;
    const d = PartnerState.deactivate(a.value, NOW);
    const r = PartnerState.reactivate(d);
    assert.equal(r.status, 'Active');
  });
});
