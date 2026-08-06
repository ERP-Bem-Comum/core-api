/**
 * Busca por CNPJ ALFANUMÉRICO em `list-suppliers` e `list-financiers` (ADR-0044).
 *
 * Desde 07/2026 a Receita emite CNPJ com letras: 12 alfanuméricos + 2 DVs numéricos,
 * `^[0-9A-Z]{12}[0-9]{2}$`. `12ABC34501DE35` é um CNPJ válido — o VO do kernel o aceita.
 *
 * Os dois use cases normalizavam o termo de busca com `replace(/\D/g,'')`, herdado de quando o
 * CNPJ era numérico. Com isso, procurar `12ABC34501DE35` virava `123450135`, que não é substring
 * do CNPJ armazenado: **a busca não encontrava o cadastro que existe**. O sintoma é pior que um
 * erro — não há mensagem, só um resultado vazio que parece "não cadastrado".
 *
 * A normalização correta remove apenas MÁSCARA (pontuação e espaço) e compara em uppercase,
 * porque o VO guarda o valor uppercase sem máscara. Os casos numéricos legados seguem funcionando
 * pelo mesmo caminho — daí as asserções de regressão.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import { supplierMatchesFilter } from '#src/modules/partners/application/use-cases/list-suppliers.ts';

import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import { financierMatchesFilter } from '#src/modules/partners/application/use-cases/list-financiers.ts';

/** CNPJ alfanumérico válido (12 alfanuméricos + 2 DVs), citado no ADR-0044. */
const ALPHA_CNPJ = '12ABC34501DE35';
/** CNPJ numérico legado — continua válido e precisa seguir buscável. */
const LEGACY_CNPJ = '11222333000181';

const supplier = (cnpj: string) => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'ACME Alimentos',
    email: 'contato@acme.com.br',
    cnpj,
    corporateName: 'ACME Alimentos LTDA',
    fantasyName: 'ACME',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    serviceRating: null,
    ratingComment: null,
    registeredAt: new Date('2026-06-01T12:00:00.000Z'),
  });
  if (!r.ok) throw new Error(`register supplier: ${r.error}`);
  return r.value.supplier;
};

const financier = (cnpj: string) => {
  const r = Financier.register({
    id: FinancierId.generate(),
    name: 'Banco Alpha',
    corporateName: 'Banco Alpha S.A.',
    legalRepresentative: 'Maria Souza',
    cnpj,
    telephone: '1133334444',
    address: 'Av. Paulista, 1000',
    registeredAt: new Date('2026-06-01T12:00:00.000Z'),
  });
  if (!r.ok) throw new Error(`register financier: ${r.error}`);
  return r.value.financier;
};

describe('list-suppliers — busca por CNPJ alfanumérico (ADR-0044)', () => {
  it('encontra pelo CNPJ alfanumérico completo', () => {
    assert.equal(supplierMatchesFilter(supplier(ALPHA_CNPJ), { search: ALPHA_CNPJ }), true);
  });

  it('encontra por prefixo alfanumérico do CNPJ', () => {
    assert.equal(supplierMatchesFilter(supplier(ALPHA_CNPJ), { search: '12ABC' }), true);
  });

  it('encontra com máscara digitada pelo usuário', () => {
    assert.equal(
      supplierMatchesFilter(supplier(ALPHA_CNPJ), { search: '12.ABC.345/01DE-35' }),
      true,
    );
  });

  it('é indiferente a caixa (o VO guarda uppercase)', () => {
    assert.equal(supplierMatchesFilter(supplier(ALPHA_CNPJ), { search: '12abc345' }), true);
  });

  it('regressão: CNPJ numérico legado segue buscável, com e sem máscara', () => {
    const s = supplier(LEGACY_CNPJ);
    assert.equal(supplierMatchesFilter(s, { search: '11222333' }), true);
    assert.equal(supplierMatchesFilter(s, { search: '11.222.333/0001-81' }), true);
  });

  it('não casa CNPJ de outro cadastro', () => {
    assert.equal(supplierMatchesFilter(supplier(ALPHA_CNPJ), { search: '99XYZ' }), false);
  });
});

describe('list-financiers — busca por CNPJ alfanumérico (ADR-0044)', () => {
  it('encontra pelo CNPJ alfanumérico completo', () => {
    assert.equal(financierMatchesFilter(financier(ALPHA_CNPJ), { search: ALPHA_CNPJ }), true);
  });

  it('encontra por prefixo alfanumérico do CNPJ', () => {
    assert.equal(financierMatchesFilter(financier(ALPHA_CNPJ), { search: '12ABC' }), true);
  });

  it('regressão: CNPJ numérico legado segue buscável', () => {
    assert.equal(financierMatchesFilter(financier(LEGACY_CNPJ), { search: '11222333' }), true);
  });

  it('não casa CNPJ de outro cadastro', () => {
    assert.equal(financierMatchesFilter(financier(ALPHA_CNPJ), { search: '99XYZ' }), false);
  });
});
