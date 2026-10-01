/**
 * #1022 — Fornecedor pessoa física: invariante PF × PJ no agregado `Supplier`.
 *
 * PF (CPF) não tem razão social nem nome fantasia — o campo não existe no tipo. Preenchidos são
 * RECUSADOS (não ignorados); branco conta como ausente. PJ (CNPJ) continua exigindo os dois.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierDocument from '#src/modules/partners/domain/supplier/supplier-document.ts';
import * as PaymentTarget from '#src/modules/partners/domain/shared/payment-target.ts';
import type { ServiceCategory } from '#src/modules/partners/domain/supplier/service-category.ts';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const LATER = new Date('2026-10-02T12:00:00.000Z');
const CPF = '12345678909';
const CNPJ = '11222333000181';

const individualInput = (over: Record<string, unknown> = {}) => ({
  id: SupplierId.generate(),
  name: 'Maria da Silva',
  email: 'maria@example.com',
  document: CPF,
  corporateName: null as string | null,
  fantasyName: null as string | null,
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
  registeredAt: NOW,
  ...over,
});

const companyEdit = (over: Record<string, unknown> = {}) => ({
  name: 'Maria da Silva',
  email: 'maria@example.com',
  document: CNPJ,
  corporateName: 'Maria da Silva Serviços LTDA' as string | null,
  fantasyName: 'MS Serviços' as string | null,
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
  ...over,
});

const registerIndividual = () => {
  const r = Supplier.register(individualInput());
  assert.ok(r.ok);
  return r.value.supplier;
};

describe('Supplier.register — pessoa física (#1022)', () => {
  it('CPF válido sem razão social/nome fantasia → PF, sem os campos', () => {
    const supplier = registerIndividual();
    assert.equal(supplier.identity.personType, 'individual');
    assert.deepEqual(supplier.identity, {
      personType: 'individual',
      document: { kind: 'cpf', value: CPF },
    });
    assert.equal(Supplier.documentOf(supplier), CPF);
  });

  it('branco conta como ausente (a tela desativa os campos e pode mandar "")', () => {
    const r = Supplier.register(individualInput({ corporateName: '', fantasyName: '   ' }));
    assert.ok(r.ok);
    assert.equal(r.value.supplier.identity.personType, 'individual');
  });

  it('SupplierRegistered carrega o documento CPF', () => {
    const r = Supplier.register(individualInput());
    assert.ok(r.ok);
    assert.equal(r.value.event.type, 'SupplierRegistered');
    if (r.value.event.type === 'SupplierRegistered') {
      assert.deepEqual(r.value.event.document, { kind: 'cpf', value: CPF });
    }
  });

  it('CPF com razão social → supplier-corporate-name-not-allowed-for-pf', () => {
    const r = Supplier.register(individualInput({ corporateName: 'Maria LTDA' }));
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-corporate-name-not-allowed-for-pf');
  });

  it('CPF com nome fantasia → supplier-fantasy-name-not-allowed-for-pf', () => {
    const r = Supplier.register(individualInput({ fantasyName: 'Maria' }));
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-fantasy-name-not-allowed-for-pf');
  });

  it('CPF com DV errado → invalid-supplier-document', () => {
    const r = Supplier.register(individualInput({ document: '12345678900' }));
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-supplier-document');
  });

  it('CNPJ sem razão social → supplier-corporate-name-required (PJ como sempre)', () => {
    const r = Supplier.register(individualInput({ document: CNPJ, fantasyName: 'FX' }));
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-corporate-name-required');
  });

  it('CNPJ sem nome fantasia → supplier-fantasy-name-required', () => {
    const r = Supplier.register(individualInput({ document: CNPJ, corporateName: 'FX LTDA' }));
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-fantasy-name-required');
  });
});

describe('Supplier.edit — troca PF ↔ PJ (#1022)', () => {
  it('PF → PJ: passa a exigir razão social e nome fantasia', () => {
    const pf = registerIndividual();
    const missing = Supplier.edit(pf, companyEdit({ corporateName: null }), LATER);
    assert.ok(!missing.ok);
    assert.equal(missing.error, 'supplier-corporate-name-required');

    const r = Supplier.edit(pf, companyEdit(), LATER);
    assert.ok(r.ok);
    assert.equal(r.value.supplier.id, pf.id);
    assert.deepEqual(r.value.supplier.identity, {
      personType: 'company',
      document: { kind: 'cnpj', value: CNPJ },
      corporateName: 'Maria da Silva Serviços LTDA',
      fantasyName: 'MS Serviços',
    });
  });

  it('PJ → PF: razão social que sobrou do cadastro PJ é recusada, não descartada', () => {
    const pf = registerIndividual();
    const pj = Supplier.edit(pf, companyEdit(), LATER);
    assert.ok(pj.ok);
    const back = Supplier.edit(
      pj.value.supplier,
      companyEdit({ document: CPF, fantasyName: null }),
      LATER,
    );
    assert.ok(!back.ok);
    assert.equal(back.error, 'supplier-corporate-name-not-allowed-for-pf');

    const ok = Supplier.edit(
      pj.value.supplier,
      companyEdit({ document: CPF, corporateName: null, fantasyName: null }),
      LATER,
    );
    assert.ok(ok.ok);
    assert.equal(ok.value.supplier.identity.personType, 'individual');
  });
});

describe('Supplier.rehydrate — identidade persistida (#1022)', () => {
  const cpfDocument = () => {
    const d = SupplierDocument.parse(CPF);
    assert.ok(d.ok);
    return d.value;
  };
  const pixKey = () => {
    const p = PaymentTarget.createPixKey({ keyType: 'email', key: 'maria@example.com' });
    assert.ok(p.ok);
    return p.value;
  };
  const base = () => ({
    id: SupplierId.generate(),
    name: 'Maria da Silva',
    email: 'maria@example.com',
    serviceCategory: 'INFORMATICA' as ServiceCategory,
    bankAccount: null,
    pixKey: pixKey(),
    serviceRating: null,
    ratingComment: null,
    status: 'Active' as const,
    deactivatedAt: null,
  });

  it('PF sem razão social/nome fantasia reidrata', () => {
    const r = Supplier.rehydrate({
      ...base(),
      document: cpfDocument(),
      corporateName: null,
      fantasyName: null,
    });
    assert.ok(r.ok);
    assert.equal(r.value.identity.personType, 'individual');
  });

  it('PF com razão social persistida → recusa (estado que o CHECK do banco proíbe)', () => {
    const r = Supplier.rehydrate({
      ...base(),
      document: cpfDocument(),
      corporateName: 'Maria LTDA',
      fantasyName: null,
    });
    assert.ok(!r.ok);
    assert.equal(r.error, 'supplier-corporate-name-not-allowed-for-pf');
  });

  it('PJ persistida com razão social em branco reidrata (o CHECK só exige NOT NULL)', () => {
    // Recusar aqui derrubaria o `list()` inteiro por uma linha gravada por fora do domínio.
    // Exigir "não-branco" é da ENTRADA (register/edit), não da leitura.
    const cnpj = SupplierDocument.parse('11222333000181');
    assert.ok(cnpj.ok);
    const r = Supplier.rehydrate({
      ...base(),
      document: cnpj.value,
      corporateName: '',
      fantasyName: ' ',
    });
    assert.ok(r.ok, r.ok ? '' : r.error);
    assert.equal(r.value.identity.personType, 'company');
  });
});
