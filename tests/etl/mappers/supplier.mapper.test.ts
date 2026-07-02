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
  serviceEvaluation: null,
  commentEvaluation: null,
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

// ---------------------------------------------------------------------------
// ETL-SUPPLIER-RATING-MAPPING: serviceEvaluation/commentEvaluation → avaliação.
// Mapa (decisão D2 da migração, 2026-07-02): 5→OTIMO, 4→BOM, 3→REGULAR,
// 2→REGULAR, 1→RUIM, null→null; fora de 1..5 → quarentena EnumUnknown.
// ---------------------------------------------------------------------------
describe('mapLegacySupplierRow — avaliação de serviço (ETL-SUPPLIER-RATING-MAPPING)', () => {
  const rated = (
    serviceEvaluation: number | null,
    commentEvaluation: string | null = null,
  ): LegacySupplierRow => ({ ...base(), serviceEvaluation, commentEvaluation });

  const cases: readonly (readonly [number, string])[] = [
    [5, 'OTIMO'],
    [4, 'BOM'],
    [3, 'REGULAR'],
    [2, 'REGULAR'],
    [1, 'RUIM'],
  ];

  for (const [evaluation, expected] of cases) {
    it(`serviceEvaluation=${String(evaluation)} → serviceRating=${expected}`, () => {
      const r = mapLegacySupplierRow(rated(evaluation));
      assert.ok(r.ok, `esperava ok p/ evaluation=${String(evaluation)}`);
      assert.equal(r.value.aggregate.serviceRating, expected);
    });
  }

  it('serviceEvaluation=null → serviceRating=null (não avaliado)', () => {
    const r = mapLegacySupplierRow(rated(null));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.serviceRating, null);
  });

  it('commentEvaluation preservado em ratingComment', () => {
    const r = mapLegacySupplierRow(rated(5, 'Excelente prestador'));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.ratingComment, 'Excelente prestador');
  });

  it('commentEvaluation em branco → ratingComment=null (normalização no ACL)', () => {
    const r = mapLegacySupplierRow(rated(5, '   '));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.ratingComment, null);
  });

  it('comentário sem nota → ratingComment preservado, serviceRating=null', () => {
    const r = mapLegacySupplierRow(rated(null, 'Comentário órfão'));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.serviceRating, null);
    assert.equal(r.value.aggregate.ratingComment, 'Comentário órfão');
  });

  it('serviceEvaluation fora de 1..5 → quarentena EnumUnknown em service_evaluation', () => {
    for (const invalid of [0, 6, -1]) {
      const r = mapLegacySupplierRow(rated(invalid));
      assert.ok(!r.ok, `esperava quarentena p/ evaluation=${String(invalid)}`);
      assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'service_evaluation'));
    }
  });

  it('quarentena carrega o valor tentado (attempted) — vai ao detalhe da DLQ', () => {
    const r = mapLegacySupplierRow(rated(6));
    assert.ok(!r.ok);
    const reason = r.error.find((e) => e.tag === 'EnumUnknown' && e.field === 'service_evaluation');
    assert.ok(reason !== undefined && 'attempted' in reason);
    assert.equal(reason.attempted, '6');
  });

  it('não-inteiro (4.5) → EnumUnknown (lookup estrito do mapa)', () => {
    const r = mapLegacySupplierRow(rated(4.5));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'service_evaluation'));
  });

  it('acúmulo cruzado: e-mail inválido + nota inválida → ambos os reasons na MESMA quarentena', () => {
    const r = mapLegacySupplierRow({ ...base(), email: 'sem-arroba', serviceEvaluation: 9 });
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.field === 'email'));
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'service_evaluation'));
  });
});
