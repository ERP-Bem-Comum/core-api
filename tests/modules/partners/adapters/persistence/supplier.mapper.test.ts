import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import {
  supplierToInsert,
  supplierFromRow,
} from '#src/modules/partners/adapters/persistence/mappers/supplier.mapper.ts';
import type { SupplierRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const bankInput = () => ({
  bank: '001',
  agency: '0001-2',
  accountNumber: '123456',
  checkDigit: '7',
});
const pixInput = () => ({ keyType: 'email', key: 'contato@fornecedor.com.br' });

const baseInput = () => ({
  id: SupplierId.generate(),
  name: 'Fornecedor X',
  email: 'contato@fornecedor.com.br',
  cnpj: '11.222.333/0001-81',
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  bankAccount: bankInput() as ReturnType<typeof bankInput> | null,
  pixKey: null as ReturnType<typeof pixInput> | null,
  registeredAt: NOW,
});

const makeActive = (over: Partial<ReturnType<typeof baseInput>> = {}) => {
  const r = Supplier.register({ ...baseInput(), ...over });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
};

describe('supplier.mapper — supplierToInsert', () => {
  it('Active com bankAccount → colunas bancárias preenchidas, pix null', () => {
    const row = supplierToInsert(makeActive({ bankAccount: bankInput(), pixKey: null }), NOW);
    assert.equal(row.active, true);
    assert.equal(row.deactivatedAt, null);
    assert.equal(row.cnpj, '11222333000181');
    assert.equal(row.bankAccountBank, '001');
    assert.equal(row.bankAccountAgency, '0001-2');
    assert.equal(row.bankAccountNumber, '123456');
    assert.equal(row.bankAccountCheckDigit, '7');
    assert.equal(row.pixKeyType, null);
    assert.equal(row.pixKey, null);
  });

  it('Active com pixKey → colunas pix preenchidas, bancárias null', () => {
    const row = supplierToInsert(makeActive({ bankAccount: null, pixKey: pixInput() }), NOW);
    assert.equal(row.bankAccountBank, null);
    assert.equal(row.bankAccountNumber, null);
    assert.equal(row.pixKeyType, 'email');
    assert.equal(row.pixKey, 'contato@fornecedor.com.br');
  });

  it('Inactive → active=false e deactivated_at preenchido', () => {
    const deactivated = Supplier.deactivate(makeActive(), LATER);
    assert.equal(isOk(deactivated), true);
    if (deactivated.ok) {
      const row = supplierToInsert(deactivated.value.supplier, NOW);
      assert.equal(row.active, false);
      assert.equal(row.deactivatedAt!.getTime(), LATER.getTime());
    }
  });
});

describe('supplier.mapper — supplierFromRow', () => {
  const bankRow: SupplierRow = {
    id: '7f3a1234-5678-4abc-9def-fedcba987654',
    name: 'Fornecedor X',
    email: 'contato@fornecedor.com.br',
    cnpj: '11222333000181',
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    active: true,
    deactivatedAt: null,
    bankAccountBank: '001',
    bankAccountAgency: '0001-2',
    bankAccountNumber: '123456',
    bankAccountCheckDigit: '7',
    pixKeyType: null,
    pixKey: null,
    serviceRating: null,
    ratingComment: null,
    createdAt: NOW,
    updatedAt: NOW,
    legacyId: null,
  };

  it('reconstrói Active com bankAccount', () => {
    const r = supplierFromRow(bankRow);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.status, 'Active');
      assert.notEqual(r.value.bankAccount, null);
      assert.equal(r.value.pixKey, null);
    }
  });

  it('reconstrói Active com pixKey', () => {
    const pixRow: SupplierRow = {
      ...bankRow,
      bankAccountBank: null,
      bankAccountAgency: null,
      bankAccountNumber: null,
      bankAccountCheckDigit: null,
      pixKeyType: 'email',
      pixKey: 'contato@fornecedor.com.br',
    };
    const r = supplierFromRow(pixRow);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.bankAccount, null);
      assert.notEqual(r.value.pixKey, null);
    }
  });

  it('reconstrói Inactive', () => {
    const r = supplierFromRow({ ...bankRow, active: false, deactivatedAt: LATER });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Inactive');
  });

  it('round-trip bank: fromRow(toInsert(s)) preserva o agregado', () => {
    const s = makeActive({ bankAccount: bankInput(), pixKey: null });
    const back = supplierFromRow({
      ...supplierToInsert(s, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as SupplierRow);
    assert.equal(isOk(back), true);
    if (back.ok) {
      assert.equal(back.value.id, s.id);
      assert.equal(back.value.cnpj, s.cnpj);
      assert.equal(back.value.bankAccount?.accountNumber, '123456');
    }
  });

  it('round-trip pix: preserva pixKey', () => {
    const s = makeActive({ bankAccount: null, pixKey: pixInput() });
    const back = supplierFromRow({
      ...supplierToInsert(s, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as SupplierRow);
    assert.equal(isOk(back), true);
    if (back.ok) assert.equal(back.value.pixKey?.key, 'contato@fornecedor.com.br');
  });

  it('rejeita id inválido', () => {
    assert.equal(isErr(supplierFromRow({ ...bankRow, id: 'not-a-uuid' })), true);
  });

  it('rejeita cnpj inválido na row', () => {
    assert.equal(isErr(supplierFromRow({ ...bankRow, cnpj: '11222333000180' })), true);
  });

  it('rejeita row sem destino de pagamento (bank e pix nulos)', () => {
    const r = supplierFromRow({
      ...bankRow,
      bankAccountBank: null,
      bankAccountAgency: null,
      bankAccountNumber: null,
      bankAccountCheckDigit: null,
      pixKeyType: null,
      pixKey: null,
    });
    assert.equal(isErr(r), true);
  });
});
