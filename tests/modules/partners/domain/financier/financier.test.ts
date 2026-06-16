import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { isUuidV4 } from '#src/shared/utils/id.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import type { ActiveFinancier } from '#src/modules/partners/domain/financier/types.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');
const VALID_CNPJ_MASKED = '11.222.333/0001-81';
const VALID_CNPJ_BARE = '11222333000181';

const bankInput = () => ({
  bank: '001',
  agency: '0001-2',
  accountNumber: '123456',
  checkDigit: '7',
});
const pixInput = () => ({ keyType: 'email', key: 'financeiro@banco.com.br' });

const validInput = () => ({
  id: FinancierId.generate(),
  name: 'Fundação Bem Comum',
  corporateName: 'Fundação Bem Comum Assistência LTDA',
  legalRepresentative: 'Maria Silva',
  cnpj: VALID_CNPJ_MASKED,
  telephone: '+5511999998888',
  address: 'Av. Paulista, 1000 — São Paulo/SP',
  bankAccount: null as ReturnType<typeof bankInput> | null,
  pixKey: null as ReturnType<typeof pixInput> | null,
  registeredAt: NOW,
});

const editInput = () => ({
  name: 'Fundação Bem Comum',
  corporateName: 'Fundação Bem Comum Assistência LTDA',
  legalRepresentative: 'Maria Silva',
  cnpj: VALID_CNPJ_MASKED,
  telephone: '+5511999998888',
  address: 'Av. Paulista, 1000 — São Paulo/SP',
  bankAccount: null as ReturnType<typeof bankInput> | null,
  pixKey: null as ReturnType<typeof pixInput> | null,
});

const registerActive = (): ActiveFinancier => {
  const r = Financier.register(validInput());
  if (!r.ok) throw new Error(`setup falhou: ${r.error}`);
  return r.value.financier;
};

describe('FinancierId', () => {
  it('generate produz UUID v4 e rehydrate valida', () => {
    const id = FinancierId.generate();
    assert.equal(isUuidV4(id as unknown as string), true);
    assert.equal(isOk(FinancierId.rehydrate(id as unknown as string)), true);
    assert.equal(isErr(FinancierId.rehydrate('nope')), true);
  });
});

describe('Financier.register', () => {
  it('cria Active com CNPJ normalizado e emite FinancierRegistered', () => {
    const r = Financier.register(validInput());
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.status, 'Active');
      assert.equal(r.value.financier.cnpj as unknown as string, VALID_CNPJ_BARE);
      assert.equal(r.value.event.type, 'FinancierRegistered');
      assert.equal(r.value.event.cnpj as unknown as string, VALID_CNPJ_BARE);
      assert.equal(r.value.event.occurredAt.getTime(), NOW.getTime());
    }
  });

  it('rejeita campos de texto vazios com erro específico', () => {
    const cases: readonly (readonly [keyof ReturnType<typeof validInput>, string])[] = [
      ['name', 'financier-name-required'],
      ['corporateName', 'financier-corporate-name-required'],
      ['legalRepresentative', 'financier-legal-representative-required'],
      ['telephone', 'financier-telephone-required'],
      ['address', 'financier-address-required'],
    ];
    for (const [field, expected] of cases) {
      const r = Financier.register({ ...validInput(), [field]: '   ' });
      assert.equal(isErr(r), true, `${field} vazio deveria falhar`);
      if (!r.ok) assert.equal(r.error, expected);
    }
  });

  it('rejeita CNPJ inválido', () => {
    const r = Financier.register({ ...validInput(), cnpj: '11222333000180' });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-cnpj');
  });

  // CA2 — banco/PIX são opcionais no Financier (NÃO há invariante "ao menos um destino").
  it('aceita ambos os destinos omitidos (bankAccount e pixKey null) → Active sem destino', () => {
    const r = Financier.register({ ...validInput(), bankAccount: null, pixKey: null });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.bankAccount, null);
      assert.equal(r.value.financier.pixKey, null);
    }
  });

  // CA1/CA5 — reconstrói os VOs de payment target via os VOs compartilhados de supplier.
  it('aceita bankAccount + pixKey válidos e os preserva no agregado', () => {
    const r = Financier.register({ ...validInput(), bankAccount: bankInput(), pixKey: pixInput() });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.bankAccount?.accountNumber, '123456');
      assert.equal(r.value.financier.pixKey?.keyType, 'email');
      assert.equal(r.value.financier.pixKey?.key, 'financeiro@banco.com.br');
    }
  });

  // CA5 — bankAccount com campos vitais em branco → invalid-bank-account.
  it('rejeita bankAccount com bank/agency/accountNumber em branco', () => {
    const r = Financier.register({
      ...validInput(),
      bankAccount: { ...bankInput(), bank: '   ' },
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-bank-account');
  });

  // CA3/CA5 — pixKey com keyType fora do enum → invalid-pix-key.
  it('rejeita pixKey com keyType inválido', () => {
    const r = Financier.register({
      ...validInput(),
      pixKey: { keyType: 'iban', key: 'algo' },
    });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-pix-key');
  });
});

describe('Financier.edit (payment target)', () => {
  it('mantém ambos null quando omitidos → ok', () => {
    const r = Financier.edit(registerActive(), { ...editInput() }, LATER);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.bankAccount, null);
      assert.equal(r.value.financier.pixKey, null);
    }
  });

  it('CA4 — troca banco→pix: adiciona pixKey e zera bankAccount', () => {
    const withBank = Financier.register({ ...validInput(), bankAccount: bankInput() });
    assert.equal(isOk(withBank), true);
    if (!withBank.ok) return;
    const r = Financier.edit(
      withBank.value.financier,
      { ...editInput(), bankAccount: null, pixKey: pixInput() },
      LATER,
    );
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.bankAccount, null);
      assert.equal(r.value.financier.pixKey?.key, 'financeiro@banco.com.br');
    }
  });

  it('CA5 — bankAccount inválido na edição → invalid-bank-account', () => {
    const r = Financier.edit(
      registerActive(),
      { ...editInput(), bankAccount: { ...bankInput(), accountNumber: '' } },
      LATER,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-bank-account');
  });
});

describe('Financier.deactivate', () => {
  it('Active → Inactive com deactivatedAt + evento', () => {
    const r = Financier.deactivate(registerActive(), LATER);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.financier.status, 'Inactive');
      assert.equal(r.value.financier.deactivatedAt.getTime(), LATER.getTime());
      assert.equal(r.value.event.type, 'FinancierDeactivated');
    }
  });

  it('idempotência: já inativo → erro', () => {
    const inactive = Financier.deactivate(registerActive(), LATER);
    assert.equal(isOk(inactive), true);
    if (inactive.ok) {
      const again = Financier.deactivate(inactive.value.financier, LATER);
      assert.equal(isErr(again), true);
      if (!again.ok) assert.equal(again.error, 'financier-already-inactive');
    }
  });
});

describe('Financier.reactivate', () => {
  it('Inactive → Active + evento', () => {
    const inactive = Financier.deactivate(registerActive(), LATER);
    assert.equal(isOk(inactive), true);
    if (inactive.ok) {
      const r = Financier.reactivate(inactive.value.financier, LATER);
      assert.equal(isOk(r), true);
      if (r.ok) {
        assert.equal(r.value.financier.status, 'Active');
        assert.equal(r.value.event.type, 'FinancierReactivated');
      }
    }
  });

  it('já ativo → erro', () => {
    const r = Financier.reactivate(registerActive(), LATER);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'financier-already-active');
  });
});
