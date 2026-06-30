/**
 * PAR-SUPPLIER-AVALIACAO — W0 (RED) — avaliação no agregado Supplier.
 *
 * DEVE FALHAR: `serviceRating`/`ratingComment` ainda não existem no agregado. GREEN no W1.
 *
 * Avaliação é OPCIONAL e independente do cadastro: nasce `null`, pode ser preenchida na
 * edição. `serviceRating` é Standard Type (VO ServiceRating); `ratingComment` é texto livre
 * (trim; vazio → null). Sem invariante cruzada (comentário não exige nota, e vice-versa) — YAGNI.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const baseInput = () => ({
  id: SupplierId.generate(),
  name: 'Fornecedor X',
  email: 'contato@fornecedor.com.br',
  cnpj: '11.222.333/0001-81',
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
  serviceRating: null as string | null,
  ratingComment: null as string | null,
  registeredAt: NOW,
});

const registerOrThrow = (over: Partial<ReturnType<typeof baseInput>> = {}) => {
  const r = Supplier.register({ ...baseInput(), ...over });
  if (!r.ok) throw new Error(`register falhou: ${r.error}`);
  return r.value.supplier;
};

describe('Supplier.register — avaliação', () => {
  it('nasce sem avaliação (serviceRating/ratingComment null) quando não informada', () => {
    const s = registerOrThrow();
    assert.equal(s.serviceRating, null);
    assert.equal(s.ratingComment, null);
  });

  it('aceita serviceRating válido + ratingComment', () => {
    const s = registerOrThrow({ serviceRating: 'BOM', ratingComment: 'Entrega pontual.' });
    assert.equal(s.serviceRating, 'BOM');
    assert.equal(s.ratingComment, 'Entrega pontual.');
  });

  it('normaliza serviceRating (trim + uppercase)', () => {
    assert.equal(registerOrThrow({ serviceRating: ' otimo ' }).serviceRating, 'OTIMO');
  });

  it('rejeita serviceRating inválido → invalid-service-rating', () => {
    const r = Supplier.register({ ...baseInput(), serviceRating: 'EXCELENTE' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-service-rating');
  });

  it('ratingComment vazio/whitespace → null', () => {
    assert.equal(registerOrThrow({ ratingComment: '   ' }).ratingComment, null);
  });
});

describe('Supplier.edit — avaliação', () => {
  it('preenche avaliação na edição de um fornecedor sem nota', () => {
    const s = registerOrThrow();
    const r = Supplier.edit(
      s,
      {
        name: s.name,
        email: s.email,
        cnpj: '11.222.333/0001-81',
        corporateName: s.corporateName,
        fantasyName: s.fantasyName,
        serviceCategory: s.serviceCategory,
        bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
        pixKey: null,
        serviceRating: 'REGULAR',
        ratingComment: 'Pode melhorar o prazo.',
      },
      LATER,
    );
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.supplier.serviceRating, 'REGULAR');
      assert.equal(r.value.supplier.ratingComment, 'Pode melhorar o prazo.');
    }
  });
});

describe('Supplier.rehydrate — avaliação', () => {
  it('preserva serviceRating/ratingComment vindos do banco', () => {
    const r = Supplier.rehydrate({
      id: SupplierId.generate(),
      name: 'F',
      email: 'a@b.com',
      cnpj: { value: '11222333000181' } as never,
      corporateName: 'F LTDA',
      fantasyName: 'F',
      serviceCategory: 'INFORMATICA' as never,
      bankAccount: { bank: '001', agency: '1', accountNumber: '1', checkDigit: '1' } as never,
      pixKey: null,
      status: 'Active',
      deactivatedAt: null,
      serviceRating: 'BOM' as never,
      ratingComment: 'ok',
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.serviceRating, 'BOM');
      assert.equal(r.value.ratingComment, 'ok');
    }
  });
});
