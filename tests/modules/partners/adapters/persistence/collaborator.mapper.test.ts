import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import {
  collaboratorToInsert,
  collaboratorFromRow,
} from '#src/modules/partners/adapters/persistence/mappers/collaborator.mapper.ts';
import type { CollaboratorRow } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const LATER = new Date('2026-06-02T12:00:00.000Z');

const PROGRAM_ID = '8f1b9c2d-3e4a-4b6c-8d9e-0f1a2b3c4d5e';

const baseRegister = () => ({
  id: CollaboratorId.generate(),
  name: 'Maria Silva',
  email: 'maria.silva@bemcomum.org',
  cpf: '111.444.777-35',
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: new Date('2025-02-01T00:00:00.000Z'),
  employmentRelationship: 'CLT',
  registeredAt: NOW,
});

const completeInput = () => ({
  rg: '12.345.678-9',
  dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  education: 'ENSINO_SUPERIOR',
  foodCategory: 'ONIVORO',
  foodCategoryDescription: null,
  completeAddress: 'Rua das Flores, 123',
  telephone: '11999998888',
  emergencyContactName: 'João Silva',
  emergencyContactTelephone: '11988887777',
  allergies: null,
  biography: null,
  experienceInThePublicSector: true,
});

const makeActive = () => {
  const r = Collaborator.register(baseRegister());
  if (!r.ok) throw new Error(`fixture collaborator: ${r.error}`);
  return r.value.collaborator;
};

const makeWithProgram = () => {
  const r = Collaborator.register({ ...baseRegister(), programId: PROGRAM_ID });
  if (!r.ok) throw new Error(`fixture collaborator+program: ${r.error}`);
  return r.value.collaborator;
};

const makeComplete = () => {
  const r = Collaborator.completeRegistration(makeActive(), completeInput(), LATER);
  if (!r.ok) throw new Error(`fixture complete: ${r.error}`);
  return r.value.collaborator;
};

const makeInactive = () => {
  const r = Collaborator.deactivate(makeActive(), 'TEMPO_CONTRATO_FINALIZADO', LATER);
  if (!r.ok) throw new Error(`fixture inactive: ${r.error}`);
  return r.value.collaborator;
};

describe('collaborator.mapper — collaboratorToInsert', () => {
  it('Active + PreRegistration → active=true, pessoais/soft-delete null', () => {
    const row = collaboratorToInsert(makeActive(), NOW);
    assert.equal(row.active, true);
    assert.equal(row.deactivatedAt, null);
    assert.equal(row.disableBy, null);
    assert.equal(row.registrationStatus, 'PreRegistration');
    assert.equal(row.cpf, '11144477735');
    assert.equal(row.rg, null);
    assert.equal(row.genderIdentity, null);
  });

  it('Complete → registration_status Complete + pessoais preenchidos', () => {
    const row = collaboratorToInsert(makeComplete(), NOW);
    assert.equal(row.registrationStatus, 'Complete');
    assert.equal(row.genderIdentity, 'MULHER_CIS');
    assert.equal(row.race, 'PARDO');
    assert.equal(row.education, 'ENSINO_SUPERIOR');
    assert.equal(row.experienceInThePublicSector, true);
  });

  it('Inactive → active=false, deactivated_at e disable_by preenchidos', () => {
    const row = collaboratorToInsert(makeInactive(), NOW);
    assert.equal(row.active, false);
    assert.equal(row.deactivatedAt!.getTime(), LATER.getTime());
    assert.equal(row.disableBy, 'TEMPO_CONTRATO_FINALIZADO');
  });

  it('sem vínculo → program_id null', () => {
    assert.equal(collaboratorToInsert(makeActive(), NOW).programId, null);
  });

  it('com vínculo → program_id preenchido (UUID)', () => {
    assert.equal(collaboratorToInsert(makeWithProgram(), NOW).programId, PROGRAM_ID);
  });
});

describe('collaborator.mapper — collaboratorFromRow', () => {
  const preRegRow: CollaboratorRow = {
    id: '7f3a1234-5678-4abc-9def-fedcba987654',
    name: 'Maria Silva',
    email: 'maria.silva@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registrationStatus: 'PreRegistration',
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
    active: true,
    disableBy: null,
    deactivatedAt: null,
    programId: null,
    createdAt: NOW,
    updatedAt: NOW,
    legacyId: null,
  };

  it('reconstrói Active + PreRegistration', () => {
    const r = collaboratorFromRow(preRegRow);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.status, 'Active');
      assert.equal(r.value.registrationStatus, 'PreRegistration');
    }
  });

  it('reconstrói Active + Complete (enums tipados)', () => {
    const completeRow: CollaboratorRow = {
      ...preRegRow,
      registrationStatus: 'Complete',
      rg: '12.345.678-9',
      dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
      genderIdentity: 'MULHER_CIS',
      race: 'PARDO',
      education: 'ENSINO_SUPERIOR',
      foodCategory: 'ONIVORO',
      experienceInThePublicSector: true,
    };
    const r = collaboratorFromRow(completeRow);
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.registrationStatus, 'Complete');
      assert.equal(r.value.genderIdentity, 'MULHER_CIS');
    }
  });

  it('reconstrói Inactive (com disable_by + deactivated_at)', () => {
    const r = collaboratorFromRow({
      ...preRegRow,
      active: false,
      disableBy: 'FALECIMENTO',
      deactivatedAt: LATER,
    });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Inactive');
  });

  it('round-trip Active+PreRegistration: fromRow(toInsert(c)) preserva id/cpf', () => {
    const c = makeActive();
    const back = collaboratorFromRow({
      ...collaboratorToInsert(c, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as CollaboratorRow);
    assert.equal(isOk(back), true);
    if (back.ok) {
      assert.equal(back.value.id, c.id);
      assert.equal(back.value.cpf, c.cpf);
    }
  });

  it('round-trip Complete: preserva enums pessoais', () => {
    const c = makeComplete();
    const back = collaboratorFromRow({
      ...collaboratorToInsert(c, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as CollaboratorRow);
    assert.equal(isOk(back), true);
    if (back.ok) {
      assert.equal(back.value.registrationStatus, 'Complete');
      assert.equal(back.value.race, 'PARDO');
    }
  });

  it('round-trip Inactive: preserva disableBy', () => {
    const c = makeInactive();
    const back = collaboratorFromRow({
      ...collaboratorToInsert(c, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as CollaboratorRow);
    assert.equal(isOk(back), true);
    if (back.ok && back.value.status === 'Inactive') {
      assert.equal(back.value.disableBy, 'TEMPO_CONTRATO_FINALIZADO');
    }
  });

  it('reconstrói program_id da row (vínculo a programa)', () => {
    const r = collaboratorFromRow({ ...preRegRow, programId: PROGRAM_ID });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.programId, PROGRAM_ID);
  });

  it('round-trip com programId: fromRow(toInsert(c)) preserva o vínculo', () => {
    const c = makeWithProgram();
    const back = collaboratorFromRow({
      ...collaboratorToInsert(c, NOW),
      createdAt: NOW,
      updatedAt: NOW,
    } as CollaboratorRow);
    assert.equal(isOk(back), true);
    if (back.ok) assert.equal(back.value.programId, PROGRAM_ID);
  });

  it('rejeita id inválido', () => {
    assert.equal(isErr(collaboratorFromRow({ ...preRegRow, id: 'not-a-uuid' })), true);
  });

  it('rejeita cpf inválido na row', () => {
    assert.equal(isErr(collaboratorFromRow({ ...preRegRow, cpf: '11144477700' })), true);
  });

  it('rejeita occupation_area inválida na row', () => {
    assert.equal(isErr(collaboratorFromRow({ ...preRegRow, occupationArea: 'XPTO' })), true);
  });

  it('rejeita registration_status inválido na row', () => {
    assert.equal(
      isErr(collaboratorFromRow({ ...preRegRow, registrationStatus: 'WHATEVER' })),
      true,
    );
  });

  it('rejeita Inactive sem disable_by (estado incoerente)', () => {
    const r = collaboratorFromRow({
      ...preRegRow,
      active: false,
      disableBy: null,
      deactivatedAt: LATER,
    });
    assert.equal(isErr(r), true);
  });
});
