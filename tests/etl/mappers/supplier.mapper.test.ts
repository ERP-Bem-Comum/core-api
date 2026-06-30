import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapLegacySupplierRow } from '#scripts/etl/mappers/supplier.mapper.ts';
import type { LegacySupplierRow } from '#scripts/etl/legacy/rows.ts';
import type { PixKeyType } from '#src/modules/partners/domain/shared/payment-target.ts';

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

// #275 (PAR-ETL-PIX-KEY-TYPE) — o legado guarda `pix_key_type` em vocabulário próprio
// (`CNPJ`/`EMAIL`/`CELLPHONE`/`ALEATORY_KEY`/`CPF`); o ETL é o ACL (Evans, DDD p.226) e deve
// TRADUZIR para o enum do core (`cnpj`/`email`/`phone`/`random-key`/`cpf`) antes de criar a
// chave PIX. Hoje o valor legado é passado cru a `createPixKey` → 82/83 suppliers quarentenam
// por `EnumUnknown` em `pix_key_type`. Os testes abaixo são RED até o translator do W1.
describe('mapLegacySupplierRow — tradução de pix_key_type legado (#275)', () => {
  // Só PIX como destino de pagamento (zera o banco), para isolar a falha no tipo da chave —
  // assim um RED nunca vem por outro campo. Demais campos vêm válidos do `base`.
  const pixOnly = (
    pix: Pick<LegacySupplierRow, 'pixInfoKeyType' | 'pixInfoKey'>,
  ): LegacySupplierRow =>
    base({
      bancaryInfoBank: null,
      bancaryInfoAgency: null,
      bancaryInfoAccountnumber: null,
      bancaryInfoDv: null,
      ...pix,
    });

  // [valor legado, chave PIX coerente com o tipo, keyType esperado já no enum do core].
  const cases: readonly (readonly [string, string, PixKeyType])[] = [
    ['CNPJ', '11444777000161', 'cnpj'],
    ['EMAIL', 'pix-fornecedor@example.com', 'email'],
    ['CELLPHONE', '+5511999998888', 'phone'],
    ['ALEATORY_KEY', '123e4567-e89b-12d3-a456-426614174000', 'random-key'],
    ['CPF', '52998224725', 'cpf'],
  ];

  for (const [legacy, key, expected] of cases) {
    it(`CA1/CA2: ${legacy} → ${expected} (ok, sem quarentena)`, () => {
      const r = mapLegacySupplierRow(pixOnly({ pixInfoKeyType: legacy, pixInfoKey: key }));
      assert.ok(r.ok, `esperava ok p/ pix_key_type=${legacy}, veio quarentena (EnumUnknown)`);
      assert.ok(r.value.aggregate.pixKey, 'esperava pixKey não-nulo');
      assert.equal(r.value.aggregate.pixKey.keyType, expected);
    });
  }

  it('CA3: pix_key_type fora do mapa (FOO) → continua EnumUnknown em pix_key_type (estrito)', () => {
    const r = mapLegacySupplierRow(
      pixOnly({ pixInfoKeyType: 'FOO', pixInfoKey: 'chave-qualquer' }),
    );
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'pix_key_type'));
  });
});
