/**
 * PAR-ACT-ACORDO — W0 (RED) — Agregado `Act` reescrito como **Acordo de Cooperação Técnica**
 * (instituição parceira, CNPJ). DEVE FALHAR enquanto o agregado modelar pessoa-física
 * (cpf/startOfContract/employmentRelationship/registrationStatus).
 *
 * Cobre: registro do acordo (sem CPF/vínculo), regra de repasse condicional
 * (hasFinancialTransfer ⇒ ≥1 payment target), unicidade de campo (actNumber/cnpj/validity),
 * ciclo de vida (deactivate/reactivate com evento) e rehydrate.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Act from '#src/modules/partners/domain/act/act.ts';
import type { RegisterActInput } from '#src/modules/partners/domain/act/types.ts';

const NOW = new Date('2026-06-06T12:00:00.000Z');
const ID = 'act-1' as never;

const VALID: Omit<RegisterActInput, 'id' | 'registeredAt'> = {
  actNumber: 'ACT-2026-001',
  name: 'Acordo de Cooperação Técnica X',
  email: 'contato@instituicao.org',
  cnpj: '11.222.333/0001-81',
  corporateName: 'Instituição Parceira LTDA',
  fantasyName: 'IP',
  occupationArea: 'PARC',
  legalRepresentative: 'João Diretor',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  hasFinancialTransfer: false,
  bankAccount: null,
  pixKey: null,
};

const register = (over: Partial<RegisterActInput> = {}) =>
  Act.register({ id: ID, ...VALID, registeredAt: NOW, ...over });

describe('Act — Acordo de Cooperação Técnica (instituição parceira)', () => {
  it('register: nasce Active, sem repasse, com campos do acordo', () => {
    const r = register();
    assert.equal(r.ok, true);
    if (!r.ok) return;
    const { act, event } = r.value;
    assert.equal(act.status, 'Active');
    assert.equal(act.actNumber, 'ACT-2026-001');
    assert.equal(act.cnpj, '11222333000181'); // normalizado (só dígitos)
    assert.equal(act.corporateName, 'Instituição Parceira LTDA');
    assert.equal(act.fantasyName, 'IP');
    assert.equal(act.legalRepresentative, 'João Diretor');
    assert.equal(act.occupationArea, 'PARC');
    assert.equal(act.hasFinancialTransfer, false);
    assert.equal(act.bankAccount, null);
    assert.equal(act.pixKey, null);
    assert.equal(act.validity.kind, 'Fixed');
    assert.equal(event.type, 'ActRegistered');
    assert.equal(event.cnpj, '11222333000181');
  });

  it('register: agregado NÃO tem mais campos de pessoa-física', () => {
    const r = register();
    assert.ok(r.ok);
    if (!r.ok) return;
    const act = r.value.act as Record<string, unknown>;
    assert.equal('cpf' in act, false);
    assert.equal('startOfContract' in act, false);
    assert.equal('employmentRelationship' in act, false);
    assert.equal('registrationStatus' in act, false);
  });

  it('register: actNumber em branco → act-number-required', () => {
    const r = register({ actNumber: '   ' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'act-number-required');
  });

  it('register: cnpj inválido → invalid-cnpj', () => {
    const r = register({ cnpj: '11.111.111/1111-11' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'invalid-cnpj');
  });

  it('register: corporateName em branco → act-corporate-name-required', () => {
    const r = register({ corporateName: '  ' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'act-corporate-name-required');
  });

  it('register: email inválido → act-email-invalid', () => {
    const r = register({ email: 'nao-eh-email' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'act-email-invalid');
  });

  it('register: endDate antes de startDate → period-end-before-start', () => {
    const r = register({ startDate: '2026-12-31', endDate: '2026-01-01' });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'period-end-before-start');
  });

  describe('regra de repasse (hasFinancialTransfer)', () => {
    const bank = { bank: '001', agency: '1234', accountNumber: '56789', checkDigit: '0' };
    const pix = { keyType: 'email', key: 'pix@instituicao.org' };

    it('repasse=true SEM bankAccount nem pixKey → act-payment-target-required', () => {
      const r = register({ hasFinancialTransfer: true, bankAccount: null, pixKey: null });
      assert.equal(r.ok, false);
      if (r.ok) return;
      assert.equal(r.error, 'act-payment-target-required');
    });

    it('repasse=true com bankAccount → ok', () => {
      const r = register({ hasFinancialTransfer: true, bankAccount: bank, pixKey: null });
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.deepEqual(r.value.act.bankAccount, bank);
    });

    it('repasse=true com pixKey → ok', () => {
      const r = register({ hasFinancialTransfer: true, bankAccount: null, pixKey: pix });
      assert.equal(r.ok, true);
      if (!r.ok) return;
      assert.equal(r.value.act.pixKey?.key, 'pix@instituicao.org');
    });

    it('repasse=false com ambos null → ok (payment target opcional)', () => {
      const r = register({ hasFinancialTransfer: false, bankAccount: null, pixKey: null });
      assert.equal(r.ok, true);
    });
  });

  describe('ciclo de vida', () => {
    const active = () => {
      const r = register();
      assert.ok(r.ok);
      if (!r.ok) throw new Error('setup');
      return r.value.act;
    };

    it('deactivate: Active → Inactive + deactivatedAt + evento', () => {
      const d = Act.deactivate(active(), NOW);
      assert.ok(d.ok);
      if (!d.ok) return;
      assert.equal(d.value.act.status, 'Inactive');
      assert.deepEqual(d.value.act.deactivatedAt, NOW);
      assert.equal(d.value.event.type, 'ActDeactivated');
    });

    it('deactivate: já Inactive → act-already-inactive', () => {
      const d1 = Act.deactivate(active(), NOW);
      assert.ok(d1.ok);
      if (!d1.ok) return;
      const d2 = Act.deactivate(d1.value.act, NOW);
      assert.equal(d2.ok, false);
      if (d2.ok) return;
      assert.equal(d2.error, 'act-already-inactive');
    });

    it('reactivate: Inactive → Active + evento', () => {
      const d = Act.deactivate(active(), NOW);
      assert.ok(d.ok);
      if (!d.ok) return;
      const a = Act.reactivate(d.value.act, NOW);
      assert.ok(a.ok);
      if (!a.ok) return;
      assert.equal(a.value.act.status, 'Active');
      assert.equal(a.value.event.type, 'ActReactivated');
    });

    it('reactivate: já Active → act-already-active', () => {
      const a = Act.reactivate(active(), NOW);
      assert.equal(a.ok, false);
      if (a.ok) return;
      assert.equal(a.error, 'act-already-active');
    });
  });

  describe('edit', () => {
    const active = () => {
      const r = register();
      assert.ok(r.ok);
      if (!r.ok) throw new Error('setup');
      return r.value.act;
    };

    it('edit: troca campos do acordo, preserva id e estado, emite ActEdited', () => {
      const edited = Act.edit(
        active(),
        {
          actNumber: 'ACT-2026-002',
          name: 'Acordo revisado',
          email: 'novo@instituicao.org',
          cnpj: '11.444.777/0001-61',
          corporateName: 'Nova Razão LTDA',
          fantasyName: 'NR',
          occupationArea: 'DDI',
          legalRepresentative: 'Maria Gestora',
          startDate: '2027-01-01',
          endDate: '2027-06-30',
          hasFinancialTransfer: false,
          bankAccount: null,
          pixKey: null,
        },
        NOW,
      );
      assert.ok(edited.ok);
      if (!edited.ok) return;
      assert.equal(edited.value.act.actNumber, 'ACT-2026-002');
      assert.equal(edited.value.act.cnpj, '11444777000161');
      assert.equal(edited.value.act.occupationArea, 'DDI');
      assert.equal(edited.value.event.type, 'ActEdited');
    });

    it('edit: repasse=true sem target → act-payment-target-required', () => {
      const edited = Act.edit(
        active(),
        {
          ...VALID,
          hasFinancialTransfer: true,
          bankAccount: null,
          pixKey: null,
        },
        NOW,
      );
      assert.equal(edited.ok, false);
      if (edited.ok) return;
      assert.equal(edited.error, 'act-payment-target-required');
    });
  });
});
