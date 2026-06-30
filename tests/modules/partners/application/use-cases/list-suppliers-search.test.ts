import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import { supplierMatchesFilter } from '#src/modules/partners/application/use-cases/list-suppliers.ts';

const baseInput = () => ({
  id: SupplierId.generate(),
  name: 'ACME Alimentos',
  email: 'contato@acme.com.br',
  cnpj: '11.222.333/0001-81',
  corporateName: 'ACME Alimentos LTDA',
  fantasyName: 'ACME',
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
  serviceRating: null as string | null,
  ratingComment: null as string | null,
  registeredAt: new Date('2026-06-01T12:00:00.000Z'),
});

const supplier = (over: Partial<ReturnType<typeof baseInput>> = {}) => {
  const r = Supplier.register({ ...baseInput(), ...over });
  if (!r.ok) throw new Error(`register: ${r.error}`);
  return r.value.supplier;
};

// #288 — busca de fornecedor deve cobrir fantasyName (apelido) e corporateName (razão social),
// além de name + cnpj. W0 RED: matchesSearch hoje só casa name + cnpj.
describe('partners/list-suppliers — busca por nome fantasia / razão social (#288)', () => {
  it('CA1: casa por fantasyName (apelido)', () => {
    const s = supplier({ name: 'ACME Alimentos', fantasyName: 'Padaria do Zé' });
    assert.equal(supplierMatchesFilter(s, { search: 'padaria' }), true);
  });

  it('CA2: casa por corporateName (razão social)', () => {
    const s = supplier({ name: 'XYZ', fantasyName: 'XYZ', corporateName: 'Comércio Alpha LTDA' });
    assert.equal(supplierMatchesFilter(s, { search: 'alpha' }), true);
  });

  it('CA3 (regressão): casa por name e por cnpj (dígitos)', () => {
    const s = supplier({ name: 'Beta Serviços' });
    assert.equal(supplierMatchesFilter(s, { search: 'beta' }), true);
    assert.equal(supplierMatchesFilter(s, { search: '11222333' }), true);
  });

  it('CA4: match case-insensitive e por substring em fantasyName', () => {
    const s = supplier({ name: 'ACME', fantasyName: 'Padaria do Zé' });
    assert.equal(supplierMatchesFilter(s, { search: 'PADARIA' }), true);
  });
});
