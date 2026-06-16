import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import {
  financierToInsert,
  financierFromRow,
} from '#src/modules/partners/adapters/persistence/mappers/financier.mapper.ts';
import type { FinancierRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const bankInput = () => ({
  bank: '001',
  agency: '0001-2',
  accountNumber: '123456',
  checkDigit: '7',
});
const pixInput = () => ({ keyType: 'email', key: 'financeiro@banco.com.br' });

const activeFinancier = (
  over: {
    bankAccount?: ReturnType<typeof bankInput> | null;
    pixKey?: ReturnType<typeof pixInput> | null;
  } = {},
) => {
  const r = Financier.register({
    id: '7f3a1234-5678-4abc-9def-fedcba987654' as never,
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj: '11.222.333/0001-81',
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    bankAccount: over.bankAccount ?? null,
    pixKey: over.pixKey ?? null,
    registeredAt: NOW,
  });
  if (!r.ok) throw new Error('fixture financier');
  return r.value.financier;
};

describe('financier.mapper — financierToInsert', () => {
  it('Active → row com active=true e deactivated_at=null', () => {
    const row = financierToInsert(activeFinancier(), NOW);
    assert.equal(row.active, true);
    assert.equal(row.deactivatedAt, null);
    assert.equal(row.cnpj, '11222333000181');
  });

  it('Inactive → row com active=false e deactivated_at preenchido', () => {
    const deactivated = Financier.deactivate(activeFinancier(), LATER);
    assert.equal(isOk(deactivated), true);
    if (deactivated.ok) {
      const row = financierToInsert(deactivated.value.financier, NOW);
      assert.equal(row.active, false);
      assert.equal(row.deactivatedAt!.getTime(), LATER.getTime());
    }
  });

  // CA6 — achatar bankAccount/pixKey em colunas.
  it('com bankAccount → colunas bancárias preenchidas, pix null', () => {
    const row = financierToInsert(activeFinancier({ bankAccount: bankInput() }), NOW);
    assert.equal(row.bankAccountBank, '001');
    assert.equal(row.bankAccountAgency, '0001-2');
    assert.equal(row.bankAccountNumber, '123456');
    assert.equal(row.bankAccountCheckDigit, '7');
    assert.equal(row.pixKeyType, null);
    assert.equal(row.pixKey, null);
  });

  it('com pixKey → colunas pix preenchidas, bancárias null', () => {
    const row = financierToInsert(activeFinancier({ pixKey: pixInput() }), NOW);
    assert.equal(row.bankAccountBank, null);
    assert.equal(row.pixKeyType, 'email');
    assert.equal(row.pixKey, 'financeiro@banco.com.br');
  });

  it('sem destino → todas as colunas de payment target null', () => {
    const row = financierToInsert(activeFinancier(), NOW);
    assert.equal(row.bankAccountBank, null);
    assert.equal(row.pixKeyType, null);
    assert.equal(row.pixKey, null);
  });
});

describe('financier.mapper — financierFromRow', () => {
  const baseRow: FinancierRow = {
    id: '7f3a1234-5678-4abc-9def-fedcba987654',
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj: '11222333000181',
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    active: true,
    deactivatedAt: null,
    bankAccountBank: null,
    bankAccountAgency: null,
    bankAccountNumber: null,
    bankAccountCheckDigit: null,
    pixKeyType: null,
    pixKey: null,
    createdAt: NOW,
    updatedAt: NOW,
    legacyId: null,
  };

  it('reconstrói Active', () => {
    const r = financierFromRow(baseRow);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Active');
  });

  it('reconstrói Inactive', () => {
    const r = financierFromRow({ ...baseRow, active: false, deactivatedAt: LATER });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Inactive');
  });

  it('round-trip: fromRow(toInsert(f)) preserva o agregado', () => {
    const f = activeFinancier();
    const row = financierToInsert(f, NOW);
    const back = financierFromRow({ ...row, createdAt: NOW, updatedAt: NOW } as FinancierRow);
    assert.equal(isOk(back), true);
    if (back.ok) {
      assert.equal(back.value.id, f.id);
      assert.equal(back.value.cnpj, f.cnpj);
      assert.equal(back.value.status, 'Active');
    }
  });

  it('rejeita id inválido', () => {
    const r = financierFromRow({ ...baseRow, id: 'not-a-uuid' });
    assert.equal(isErr(r), true);
  });

  it('rejeita cnpj inválido na row', () => {
    const r = financierFromRow({ ...baseRow, cnpj: '11222333000180' });
    assert.equal(isErr(r), true);
  });

  // CA6 — reconstrói os VOs de payment target da row.
  it('reconstrói bankAccount da row', () => {
    const r = financierFromRow({
      ...baseRow,
      bankAccountBank: '001',
      bankAccountAgency: '0001-2',
      bankAccountNumber: '123456',
      bankAccountCheckDigit: '7',
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.bankAccount?.accountNumber, '123456');
      assert.equal(r.value.pixKey, null);
    }
  });

  it('reconstrói pixKey da row', () => {
    const r = financierFromRow({
      ...baseRow,
      pixKeyType: 'email',
      pixKey: 'financeiro@banco.com.br',
    });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.bankAccount, null);
      assert.equal(r.value.pixKey?.key, 'financeiro@banco.com.br');
    }
  });

  it('CA6 — ambos null → bankAccount=null e pixKey=null sem erro', () => {
    const r = financierFromRow(baseRow);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.bankAccount, null);
      assert.equal(r.value.pixKey, null);
    }
  });

  it('CA6 — round-trip bank: fromRow(toInsert(f)) preserva bankAccount', () => {
    const f = activeFinancier({ bankAccount: bankInput() });
    const back = financierFromRow({
      ...financierToInsert(f, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as FinancierRow);
    assert.equal(isOk(back), true);
    if (back.ok) assert.equal(back.value.bankAccount?.accountNumber, '123456');
  });

  it('CA6 — round-trip pix: preserva pixKey', () => {
    const f = activeFinancier({ pixKey: pixInput() });
    const back = financierFromRow({
      ...financierToInsert(f, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as FinancierRow);
    assert.equal(isOk(back), true);
    if (back.ok) assert.equal(back.value.pixKey?.key, 'financeiro@banco.com.br');
  });
});
