/**
 * PAR-COLLABORATOR-FIELDS — W0 (RED) — novos campos do agregado Collaborator:
 * PERFIL (#41), TERRITÓRIO (#42), BANCÁRIO (#40 lado Colaborador).
 *
 * DEVE FALHAR: `CompleteRegistrationInput`/`completeRegistration` ainda não conhecem os campos
 * novos; `register` não inicializa território/banco/pix como null. GREEN quando o W1 entregar.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const baseRegister = () => ({
  id: CollaboratorId.generate(),
  name: 'Maria Silva',
  email: 'maria@bemcomum.org',
  cpf: '11144477735',
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: new Date('2026-01-10T00:00:00.000Z'),
  employmentRelationship: 'CLT',
  registeredAt: NOW,
});

// Payload de completeRegistration estendido (todos nullable; os já existentes em null).
const emptyPersonal = () => ({
  rg: null,
  dateOfBirth: null,
  genderIdentity: null,
  race: null,
  education: null,
  foodCategory: null,
  foodCategoryDescription: null,
  completeAddress: null,
  telephone: null,
  emergencyContactName: null,
  emergencyContactTelephone: null,
  allergies: null,
  biography: null,
  experienceInThePublicSector: null,
  // novos — PERFIL
  sex: null,
  maritalStatus: null,
  hasChildren: null,
  childrenCount: null,
  childrenAges: null,
  isPwd: null,
  pwdDescription: null,
  isOnLeave: null,
  leaveDuration: null,
  leaveRenewable: null,
  leaveRenewalDuration: null,
  publicSectorExperienceDuration: null,
  // novos — TERRITÓRIO
  territory: null,
  // novos — BANCÁRIO
  bankAccount: null,
  pixKey: null,
});

const registerActive = () => {
  const r = Collaborator.register({ ...baseRegister() });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('Collaborator.register — campos novos inicializam null', () => {
  it('território/banco/pix/perfil nascem null', () => {
    const c = registerActive();
    assert.equal(c.sex, null);
    assert.equal(c.maritalStatus, null);
    assert.equal(c.isPwd, null);
    assert.equal(c.isOnLeave, null);
    assert.equal(c.publicSectorExperienceDuration, null);
    assert.equal(c.territory, null);
    assert.equal(c.bankAccount, null);
    assert.equal(c.pixKey, null);
  });
});

describe('Collaborator.completeRegistration — PERFIL (#41)', () => {
  it('persiste sex/maritalStatus/PCD/afastamento válidos', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      {
        ...emptyPersonal(),
        sex: 'F',
        maritalStatus: 'married',
        hasChildren: true,
        childrenCount: 2,
        childrenAges: '5,8',
        isPwd: true,
        pwdDescription: 'baixa visão',
        isOnLeave: false,
        leaveDuration: null,
        leaveRenewable: null,
        leaveRenewalDuration: null,
        publicSectorExperienceDuration: '3 anos',
      },
      LATER,
    );
    assert.equal(isOk(r), true);
    if (r.ok) {
      const c = r.value.collaborator;
      assert.equal(c.registrationStatus, 'Complete');
      assert.equal(c.sex, 'F');
      assert.equal(c.maritalStatus, 'married');
      assert.equal(c.hasChildren, true);
      assert.equal(c.childrenCount, 2);
      assert.equal(c.isPwd, true);
      assert.equal(c.pwdDescription, 'baixa visão');
      assert.equal(c.publicSectorExperienceDuration, '3 anos');
    }
  });

  it('sex fora de F|M → sex-invalid (#41 CA2)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      { ...emptyPersonal(), sex: 'X' },
      LATER,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'sex-invalid');
  });

  it('maritalStatus fora do enum → marital-status-invalid (#41 CA3)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      { ...emptyPersonal(), maritalStatus: 'engaged' },
      LATER,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'marital-status-invalid');
  });
});

describe('Collaborator.completeRegistration — TERRITÓRIO (#42)', () => {
  it('UF + município válidos viram objeto territory', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      { ...emptyPersonal(), territory: { uf: 'SP', municipality: 'São Paulo' } },
      LATER,
    );
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.deepEqual(r.value.collaborator.territory, {
        uf: 'SP',
        municipality: 'São Paulo',
      });
    }
  });

  it('UF inválida → territory-uf-invalid (#42 CA3)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      { ...emptyPersonal(), territory: { uf: 'XX', municipality: 'Cidade' } },
      LATER,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'territory-uf-invalid');
  });

  it('território ausente → territory null (backward-compatible)', () => {
    const r = Collaborator.completeRegistration(registerActive(), { ...emptyPersonal() }, LATER);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.collaborator.territory, null);
  });

  it('território preservado ao desativar (#42 CA4)', () => {
    const completed = Collaborator.completeRegistration(
      registerActive(),
      { ...emptyPersonal(), territory: { uf: 'CE', municipality: 'Fortaleza' } },
      LATER,
    );
    assert.ok(completed.ok);
    const off = Collaborator.deactivate(completed.value.collaborator, 'FALECIMENTO', LATER);
    assert.ok(off.ok);
    assert.deepEqual(off.value.collaborator.territory, { uf: 'CE', municipality: 'Fortaleza' });
  });
});

describe('Collaborator.completeRegistration — BANCÁRIO (#40 lado Colaborador)', () => {
  it('bankAccount + pixKey válidos persistem (#40 CA2)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      {
        ...emptyPersonal(),
        bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
        pixKey: { keyType: 'email', key: 'maria@bemcomum.org' },
      },
      LATER,
    );
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.deepEqual(r.value.collaborator.bankAccount, {
        bank: '001',
        agency: '0001-2',
        accountNumber: '123456',
        checkDigit: '7',
      });
      assert.equal(r.value.collaborator.pixKey?.keyType, 'email');
    }
  });

  it('agência inválida → bank-agency-invalid (#40 CA3)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      {
        ...emptyPersonal(),
        bankAccount: { bank: '001', agency: '1', accountNumber: '123', checkDigit: '0' },
        pixKey: null,
      },
      LATER,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-agency-invalid');
  });

  it('pixKey.keyType inválido → invalid-pix-key (#40 CA4)', () => {
    const r = Collaborator.completeRegistration(
      registerActive(),
      { ...emptyPersonal(), bankAccount: null, pixKey: { keyType: 'token', key: 'x' } },
      LATER,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-pix-key');
  });
});
