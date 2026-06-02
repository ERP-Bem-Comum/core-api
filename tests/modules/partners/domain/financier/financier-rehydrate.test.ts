import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';

const cnpj = () => {
  const c = Cnpj.parse('11222333000181');
  if (!c.ok) throw new Error('fixture cnpj');
  return c.value;
};

const base = () => ({
  id: FinancierId.generate(),
  name: 'Fundação Bem Comum',
  corporateName: 'Fundação Bem Comum LTDA',
  legalRepresentative: 'Maria Silva',
  cnpj: cnpj(),
  telephone: '+5511999998888',
  address: 'Av. Paulista, 1000',
});

describe('Financier.rehydrate', () => {
  it('reconstrói um Active', () => {
    const r = Financier.rehydrate({ ...base(), status: 'Active', deactivatedAt: null });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Active');
  });

  it('reconstrói um Inactive com deactivatedAt', () => {
    const at = new Date('2026-06-02T00:00:00.000Z');
    const r = Financier.rehydrate({ ...base(), status: 'Inactive', deactivatedAt: at });
    assert.equal(isOk(r), true);
    if (r.ok && r.value.status === 'Inactive') {
      assert.equal(r.value.deactivatedAt.getTime(), at.getTime());
    }
  });

  it('rejeita Inactive sem deactivatedAt (estado incoerente)', () => {
    const r = Financier.rehydrate({ ...base(), status: 'Inactive', deactivatedAt: null });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'financier-inactive-requires-deactivated-at');
  });
});
