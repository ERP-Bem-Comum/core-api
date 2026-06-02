import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { isUuidV4 } from '#src/shared/utils/id.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as ServiceCategory from '#src/modules/partners/domain/supplier/service-category.ts';
import * as PaymentTarget from '#src/modules/partners/domain/supplier/payment-target.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';

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

const validInput = (
  over: Partial<ReturnType<typeof baseInput>> = {},
): ReturnType<typeof baseInput> => ({ ...baseInput(), ...over });

describe('SupplierId', () => {
  it('generate produz UUID v4', () => {
    assert.equal(isUuidV4(SupplierId.generate() as unknown as string), true);
  });
});

describe('ServiceCategory.parse', () => {
  it('aceita os valores legados (inclui typos ONGANIZACAO_DE_EVENTOS / TRASPORTE)', () => {
    for (const c of ['AGUA', 'INFORMATICA', 'ONGANIZACAO_DE_EVENTOS', 'TRASPORTE', 'BANCO']) {
      assert.equal(isOk(ServiceCategory.parse(c)), true, `deveria aceitar ${c}`);
    }
  });
  it('rejeita valor desconhecido', () => {
    const r = ServiceCategory.parse('NAO_EXISTE');
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-service-category');
  });
});

describe('PaymentTarget VOs', () => {
  it('BankAccount.create valida campos', () => {
    assert.equal(isOk(PaymentTarget.createBankAccount(bankInput())), true);
    assert.equal(isErr(PaymentTarget.createBankAccount({ ...bankInput(), bank: '' })), true);
  });
  it('PixKey.create valida keyType e key', () => {
    assert.equal(isOk(PaymentTarget.createPixKey(pixInput())), true);
    assert.equal(isErr(PaymentTarget.createPixKey({ keyType: 'invalid', key: 'x' })), true);
    assert.equal(isErr(PaymentTarget.createPixKey({ keyType: 'email', key: '' })), true);
  });
});

describe('Supplier.register', () => {
  it('cria Active com banco e emite SupplierRegistered (cnpj normalizado)', () => {
    const r = Supplier.register(validInput());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.supplier.status, 'Active');
      assert.equal(r.value.supplier.cnpj as unknown as string, '11222333000181');
      assert.notEqual(r.value.supplier.bankAccount, null);
      assert.equal(r.value.supplier.pixKey, null);
      assert.equal(r.value.event.type, 'SupplierRegistered');
    }
  });

  it('aceita só pix (sem banco)', () => {
    const r = Supplier.register(validInput({ bankAccount: null, pixKey: pixInput() }));
    assert.equal(isOk(r), true);
    if (r.ok) assert.notEqual(r.value.supplier.pixKey, null);
  });

  it('rejeita sem banco e sem pix', () => {
    const r = Supplier.register(validInput({ bankAccount: null, pixKey: null }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-payment-target-required');
  });

  it('rejeita email inválido', () => {
    const r = Supplier.register(validInput({ email: 'nope' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-email-invalid');
  });

  it('rejeita CNPJ inválido e serviceCategory desconhecida', () => {
    assert.equal(isErr(Supplier.register(validInput({ cnpj: '11222333000180' }))), true);
    const sc = Supplier.register(validInput({ serviceCategory: 'NAO_EXISTE' }));
    assert.equal(isErr(sc), true);
    if (!sc.ok) assert.equal(sc.error, 'invalid-service-category');
  });

  it('rejeita name vazio', () => {
    const r = Supplier.register(validInput({ name: '  ' }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'supplier-name-required');
  });
});

describe('Supplier.deactivate / reactivate', () => {
  const active = () => {
    const r = Supplier.register(validInput());
    if (!r.ok) throw new Error('fixture');
    return r.value.supplier;
  };

  it('Active → Inactive e idempotência', () => {
    const d = Supplier.deactivate(active(), LATER);
    assert.equal(isOk(d), true);
    if (d.ok) {
      assert.equal(d.value.supplier.status, 'Inactive');
      const again = Supplier.deactivate(d.value.supplier, LATER);
      assert.equal(isErr(again), true);
      if (!again.ok) assert.equal(again.error, 'supplier-already-inactive');
    }
  });

  it('reactivate volta para Active; já ativo → erro', () => {
    const d = Supplier.deactivate(active(), LATER);
    if (d.ok) {
      const r = Supplier.reactivate(d.value.supplier, LATER);
      assert.equal(isOk(r), true);
      if (r.ok) assert.equal(r.value.supplier.status, 'Active');
    }
    const r2 = Supplier.reactivate(active(), LATER);
    assert.equal(isErr(r2), true);
    if (!r2.ok) assert.equal(r2.error, 'supplier-already-active');
  });
});
