/**
 * PAR-COLLABORATOR-PROFILE-FIELDS (US2). Campos de perfil em completeRegistration.
 * DEVE FALHAR no W0: os 12 campos + a coerência de filhos ainda não existem. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const NOW = new Date('2026-01-10T08:00:00.000Z');

const preRegistered = () => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

// Campos pessoais legados (mínimos, todos null) + os novos sob teste.
const baseComplete = {
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
};

describe('Collaborator.completeRegistration — campos de perfil (US2)', () => {
  it('CA1: aceita os campos novos e os reflete no agregado', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      {
        ...baseComplete,
        sex: 'F',
        maritalStatus: 'married',
        hasChildren: true,
        childrenCount: 2,
        childrenAges: [5, 8],
        isPwd: false,
        isOnLeave: true,
        leaveDuration: '6 meses',
        leaveRenewable: true,
        leaveRenewalDuration: '3 meses',
        publicSectorExperienceDuration: '4 anos',
      },
      NOW,
    );
    assert.ok(r.ok, `esperado ok: ${r.ok ? '' : r.error}`);
    if (r.ok) {
      assert.equal(r.value.collaborator.sex, 'F');
      assert.equal(r.value.collaborator.maritalStatus, 'married');
      assert.deepEqual(r.value.collaborator.childrenAges, [5, 8]);
      assert.equal(r.value.collaborator.publicSectorExperienceDuration, '4 anos');
    }
  });

  it('CA2: sex fora de F|M → sex-invalid', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...baseComplete, sex: 'X' },
      NOW,
    );
    assert.ok(!r.ok);
    assert.equal(r.error, 'sex-invalid');
  });

  it('CA3: maritalStatus fora do enum → marital-status-invalid', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...baseComplete, maritalStatus: 'complicated' },
      NOW,
    );
    assert.ok(!r.ok);
    assert.equal(r.error, 'marital-status-invalid');
  });

  it('coerência: hasChildren=false com childrenCount>0 → collaborator-children-inconsistent', () => {
    const r = Collaborator.completeRegistration(
      preRegistered(),
      { ...baseComplete, hasChildren: false, childrenCount: 2 },
      NOW,
    );
    assert.ok(!r.ok);
    assert.equal(r.error, 'collaborator-children-inconsistent');
  });

  it('CA4: campos nullable omitidos permanecem null', () => {
    const r = Collaborator.completeRegistration(preRegistered(), { ...baseComplete }, NOW);
    assert.ok(r.ok);
    if (r.ok) {
      assert.equal(r.value.collaborator.sex, null);
      assert.equal(r.value.collaborator.maritalStatus, null);
      assert.equal(r.value.collaborator.childrenAges, null);
    }
  });
});
