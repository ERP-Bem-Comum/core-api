import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapLegacyFinancierRow } from '#scripts/etl/mappers/financier.mapper.ts';
import type { LegacyFinancierRow } from '#scripts/etl/legacy/rows.ts';

// Fixtures SINTÉTICOS — nunca PII real. CNPJ válido gerado p/ teste; inválido por construção.
const VALID_CNPJ = '11444777000161';
const NOW = new Date('2026-06-01T12:00:00.000Z');
const UPDATED = new Date('2026-06-02T09:30:00.000Z');

const base = (over: Partial<LegacyFinancierRow> = {}): LegacyFinancierRow => ({
  id: 7,
  name: 'Fundação Teste',
  corporateName: 'Fundação Teste LTDA',
  legalRepresentative: 'Fulano de Tal',
  cnpj: VALID_CNPJ,
  telephone: '1133334444',
  address: 'Rua das Flores, 100',
  active: 1,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

describe('mapLegacyFinancierRow', () => {
  it('linha ativa válida → ok com agregado Active e legacyId', () => {
    const r = mapLegacyFinancierRow(base());
    assert.ok(r.ok, 'esperava ok');
    assert.equal(r.value.legacyId, 7);
    assert.equal(r.value.aggregate.status, 'Active');
    assert.equal(r.value.aggregate.name, 'Fundação Teste');
  });

  it('linha inativa (active=0) → Inactive com deactivatedAt = updatedAt (D10)', () => {
    const r = mapLegacyFinancierRow(base({ active: 0 }));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.status, 'Inactive');
    if (r.value.aggregate.status === 'Inactive') {
      assert.equal(r.value.aggregate.deactivatedAt.getTime(), UPDATED.getTime());
    }
  });

  it('cnpj inválido → quarentena CnpjInvalid', () => {
    const r = mapLegacyFinancierRow(base({ cnpj: 'xxx' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'CnpjInvalid' && e.field === 'cnpj'));
  });

  it('acumula múltiplos erros (name vazio + cnpj inválido)', () => {
    const r = mapLegacyFinancierRow(base({ name: '   ', cnpj: 'xxx' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'name'));
    assert.ok(r.error.some((e) => e.tag === 'CnpjInvalid'));
    assert.ok(r.error.length >= 2, 'deve acumular ambos os erros');
  });
});
