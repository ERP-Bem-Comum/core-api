import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { BOM, LINE_TERMINATOR } from '#src/shared/utils/csv.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorType } from '#src/modules/partners/domain/collaborator/types.ts';
import { collaboratorsToCsv } from '#src/modules/partners/adapters/export/collaborator-csv.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const START = new Date('2025-02-01T00:00:00.000Z');
const DEACTIVATED_AT = new Date('2026-06-02T15:30:00.000Z');

const EXPECTED_HEADER = [
  'id',
  'name',
  'email',
  'cpf',
  'occupationArea',
  'role',
  'startOfContract',
  'employmentRelationship',
  'registrationStatus',
  'status',
  'rg',
  'dateOfBirth',
  'genderIdentity',
  'race',
  'education',
  'foodCategory',
  'foodCategoryDescription',
  'completeAddress',
  'telephone',
  'emergencyContactName',
  'emergencyContactTelephone',
  'allergies',
  'biography',
  'experienceInThePublicSector',
  'disableBy',
  'deactivatedAt',
].join(',');

const baseRegister = (over: Record<string, unknown> = {}) => ({
  id: CollaboratorId.generate(),
  name: 'Maria Silva',
  email: 'maria.silva@bemcomum.org',
  cpf: '111.444.777-35',
  occupationArea: 'PARC',
  role: 'Educadora',
  startOfContract: START,
  employmentRelationship: 'CLT',
  registeredAt: NOW,
  ...over,
});

const completeInput = () => ({
  rg: '12.345.678-9',
  dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  education: 'ENSINO_SUPERIOR',
  foodCategory: 'ONIVORO',
  foodCategoryDescription: null,
  completeAddress: 'Rua das Flores 123',
  telephone: '11999998888',
  emergencyContactName: 'João Silva',
  emergencyContactTelephone: '11988887777',
  allergies: null,
  biography: null,
  experienceInThePublicSector: true,
});

const makeActive = (over: Record<string, unknown> = {}): CollaboratorType => {
  const r = Collaborator.register(baseRegister(over));
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const makeComplete = (): CollaboratorType => {
  const r = Collaborator.completeRegistration(makeActive(), completeInput(), NOW);
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const makeInactive = (): CollaboratorType => {
  const r = Collaborator.deactivate(makeActive(), 'TEMPO_CONTRATO_FINALIZADO', DEACTIVATED_AT);
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const dataLines = (csv: string): readonly string[] =>
  csv
    .split(LINE_TERMINATOR)
    .slice(1)
    .filter((l) => l.length > 0);

describe('collaboratorsToCsv — header e vazio', () => {
  it('lista vazia → BOM + header + CRLF (sem linhas de dados)', () => {
    assert.equal(collaboratorsToCsv([]), `${BOM}${EXPECTED_HEADER}${LINE_TERMINATOR}`);
  });

  it('output sempre inicia com BOM + header', () => {
    const out = collaboratorsToCsv([makeActive()]);
    assert.equal(out.startsWith(`${BOM}${EXPECTED_HEADER}${LINE_TERMINATOR}`), true);
  });

  it('cada linha termina em CRLF', () => {
    const out = collaboratorsToCsv([makeActive(), makeInactive()]);
    assert.equal(out.endsWith(LINE_TERMINATOR), true);
  });
});

describe('collaboratorsToCsv — Active + PreRegistration', () => {
  it('status=Active, registrationStatus=PreRegistration, pessoais/soft-delete vazios', () => {
    const cells = dataLines(collaboratorsToCsv([makeActive()]))[0]?.split(',') ?? [];
    assert.equal(cells[3], '11144477735'); // cpf normalizado
    assert.equal(cells[8], 'PreRegistration'); // registrationStatus
    assert.equal(cells[9], 'Active'); // status
    assert.equal(cells[10], ''); // rg
    assert.equal(cells[12], ''); // genderIdentity
    assert.equal(cells[23], ''); // experienceInThePublicSector
    assert.equal(cells[24], ''); // disableBy
    assert.equal(cells[25], ''); // deactivatedAt
  });

  it('startOfContract em ISO 8601', () => {
    const cells = dataLines(collaboratorsToCsv([makeActive()]))[0]?.split(',') ?? [];
    assert.equal(cells[6], START.toISOString());
  });
});

describe('collaboratorsToCsv — Active + Complete', () => {
  it('enums pessoais preenchidos e experienceInThePublicSector=true', () => {
    const cells = dataLines(collaboratorsToCsv([makeComplete()]))[0]?.split(',') ?? [];
    assert.equal(cells[8], 'Complete'); // registrationStatus
    assert.equal(cells[12], 'MULHER_CIS'); // genderIdentity
    assert.equal(cells[13], 'PARDO'); // race
    assert.equal(cells[14], 'ENSINO_SUPERIOR'); // education
    assert.equal(cells[15], 'ONIVORO'); // foodCategory
    assert.equal(cells[23], 'true'); // experienceInThePublicSector
  });
});

describe('collaboratorsToCsv — Inactive', () => {
  it('status=Inactive, disableBy preenchido, deactivatedAt em ISO 8601', () => {
    const cells = dataLines(collaboratorsToCsv([makeInactive()]))[0]?.split(',') ?? [];
    assert.equal(cells[9], 'Inactive');
    assert.equal(cells[24], 'TEMPO_CONTRATO_FINALIZADO');
    assert.equal(cells[25], DEACTIVATED_AT.toISOString());
  });
});

describe('collaboratorsToCsv — projeção alimenta o escape do util', () => {
  it('nome com vírgula sai citado (RFC 4180 herdado do util)', () => {
    const c = makeActive({ name: 'Alpha, Beta' });
    assert.equal(collaboratorsToCsv([c]).includes('"Alpha, Beta"'), true);
  });

  it('nome iniciando em = recebe prefixo anti-fórmula', () => {
    const c = makeActive({ name: '=cmd()' });
    assert.equal(collaboratorsToCsv([c]).includes("'=cmd()"), true);
  });
});
