import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapLegacySupplierRow } from '#scripts/etl/mappers/supplier.mapper.ts';
import type { LegacySupplierRow } from '#scripts/etl/legacy/rows.ts';

const VALID_CNPJ = '11444777000161';
const NOW = new Date('2026-06-01T12:00:00.000Z');
const UPDATED = new Date('2026-06-02T09:30:00.000Z');

const base = (over: Partial<LegacySupplierRow> = {}): LegacySupplierRow => ({
  id: 12,
  name: 'Fornecedor Teste',
  email: 'fornecedor@example.com',
  cnpj: VALID_CNPJ,
  corporateName: 'Fornecedor Teste LTDA',
  fantasyName: 'FT',
  serviceCategory: 'INFORMATICA',
  active: 1,
  bancaryInfoBank: '001',
  bancaryInfoAgency: '1234',
  bancaryInfoAccountnumber: '567890',
  bancaryInfoDv: '1',
  pixInfoKeyType: null,
  pixInfoKey: null,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

describe('mapLegacySupplierRow', () => {
  it('válido com conta bancária → ok Active', () => {
    const r = mapLegacySupplierRow(base());
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 12);
    assert.equal(r.value.aggregate.status, 'Active');
    assert.notEqual(r.value.aggregate.bankAccount, null);
  });

  it('válido com pix (sem banco) → ok', () => {
    const r = mapLegacySupplierRow(
      base({
        bancaryInfoBank: null,
        bancaryInfoAgency: null,
        bancaryInfoAccountnumber: null,
        bancaryInfoDv: null,
        pixInfoKeyType: 'email',
        pixInfoKey: 'pix@example.com',
      }),
    );
    assert.ok(r.ok);
    assert.notEqual(r.value.aggregate.pixKey, null);
  });

  it('inativo (active=0) → Inactive com deactivatedAt (D10)', () => {
    const r = mapLegacySupplierRow(base({ active: 0 }));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.status, 'Inactive');
  });

  it('serviceCategory desconhecido → EnumUnknown', () => {
    const r = mapLegacySupplierRow(base({ serviceCategory: 'CRIPTO' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'service_category'));
  });

  it('email inválido → EmailInvalid', () => {
    const r = mapLegacySupplierRow(base({ email: 'sem-arroba' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EmailInvalid'));
  });

  it('sem nenhum destino de pagamento → RequiredFieldMissing payment_target', () => {
    const r = mapLegacySupplierRow(
      base({
        bancaryInfoBank: null,
        bancaryInfoAgency: null,
        bancaryInfoAccountnumber: null,
        bancaryInfoDv: null,
        pixInfoKeyType: null,
        pixInfoKey: null,
      }),
    );
    assert.ok(!r.ok);
    assert.ok(
      r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'payment_target'),
    );
  });

  it('acumula email inválido + cnpj inválido', () => {
    const r = mapLegacySupplierRow(base({ email: 'x', cnpj: 'yy' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EmailInvalid'));
    assert.ok(r.error.some((e) => e.tag === 'CnpjInvalid'));
  });
});
