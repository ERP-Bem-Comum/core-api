/**
 * PAR-COLLABORATOR-FIELDS — W0 (RED) — round-trip dos campos novos no mapper Collaborator.
 *
 * DEVE FALHAR: `collaboratorToInsert`/`collaboratorFromRow` (e o tipo `CollaboratorRow`) ainda
 * não conhecem as colunas de PERFIL/território/banco/pix. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import {
  collaboratorToInsert,
  collaboratorFromRow,
} from '#src/modules/partners/adapters/persistence/mappers/collaborator.mapper.ts';
import type { CollaboratorRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

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
  territory: null,
  bankAccount: null,
  pixKey: null,
});

const makeCompleteWithFields = () => {
  const reg = Collaborator.register({
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
  if (!reg.ok) throw new Error(`fixture register: ${reg.error}`);
  const done = Collaborator.completeRegistration(
    reg.value.collaborator,
    {
      ...emptyPersonal(),
      sex: 'F',
      maritalStatus: 'married',
      hasChildren: true,
      childrenCount: 2,
      childrenAges: '5,8',
      isPwd: true,
      pwdDescription: 'baixa visão',
      isOnLeave: true,
      leaveDuration: '90 dias',
      leaveRenewable: true,
      leaveRenewalDuration: '30 dias',
      publicSectorExperienceDuration: '3 anos',
      territory: { uf: 'SP', municipality: 'São Paulo' },
      bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
      pixKey: { keyType: 'email', key: 'maria@bemcomum.org' },
    },
    LATER,
  );
  if (!done.ok) throw new Error(`fixture complete: ${done.error}`);
  return done.value.collaborator;
};

describe('collaborator.mapper — campos novos achatados em colunas', () => {
  it('collaboratorToInsert achata PERFIL/território/banco/pix', () => {
    const row = collaboratorToInsert(makeCompleteWithFields(), NOW);
    assert.equal(row.sex, 'F');
    assert.equal(row.maritalStatus, 'married');
    assert.equal(row.hasChildren, true);
    assert.equal(row.childrenCount, 2);
    assert.equal(row.childrenAges, '5,8');
    assert.equal(row.isPwd, true);
    assert.equal(row.pwdDescription, 'baixa visão');
    assert.equal(row.isOnLeave, true);
    assert.equal(row.leaveDuration, '90 dias');
    assert.equal(row.leaveRenewable, true);
    assert.equal(row.leaveRenewalDuration, '30 dias');
    assert.equal(row.publicSectorExperienceDuration, '3 anos');
    assert.equal(row.territoryUf, 'SP');
    assert.equal(row.territoryMunicipality, 'São Paulo');
    assert.equal(row.bankAccountBank, '001');
    assert.equal(row.bankAccountAgency, '0001-2');
    assert.equal(row.pixKeyType, 'email');
    assert.equal(row.pixKey, 'maria@bemcomum.org');
  });

  it('round-trip Complete: fromRow(toInsert(c)) preserva os campos novos', () => {
    const c = makeCompleteWithFields();
    const back = collaboratorFromRow({
      ...collaboratorToInsert(c, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as CollaboratorRow);
    assert.equal(isOk(back), true);
    if (back.ok) {
      assert.equal(back.value.sex, 'F');
      assert.equal(back.value.maritalStatus, 'married');
      assert.equal(back.value.childrenCount, 2);
      assert.equal(back.value.publicSectorExperienceDuration, '3 anos');
      assert.deepEqual(back.value.territory, { uf: 'SP', municipality: 'São Paulo' });
      assert.deepEqual(back.value.bankAccount, {
        bank: '001',
        agency: '0001-2',
        accountNumber: '123456',
        checkDigit: '7',
      });
      assert.equal(back.value.pixKey?.key, 'maria@bemcomum.org');
    }
  });
});
