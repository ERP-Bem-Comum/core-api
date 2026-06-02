import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapLegacyCollaboratorRow } from '#scripts/etl/mappers/collaborator.mapper.ts';
import type { LegacyCollaboratorRow } from '#scripts/etl/legacy/rows.ts';

const VALID_CPF = '52998224725';
const NOW = new Date('2026-06-01T12:00:00.000Z');
const UPDATED = new Date('2026-06-02T09:30:00.000Z');

const base = (over: Partial<LegacyCollaboratorRow> = {}): LegacyCollaboratorRow => ({
  id: 42,
  name: 'Colaborador Teste',
  email: 'colab@example.com',
  cpf: VALID_CPF,
  occupationArea: 'PARC',
  role: 'Analista',
  startOfContract: NOW,
  employmentRelationship: 'CLT',
  status: 'CADASTRO_COMPLETO',
  active: 1,
  disableBy: null,
  rg: '123456789',
  dateOfBirth: new Date('1990-05-10T00:00:00.000Z'),
  genderIdentity: 'MULHER_CIS',
  race: 'PARDO',
  education: 'ENSINO_SUPERIOR',
  foodCategory: 'ONIVORO',
  foodCategoryDescription: null,
  completeAddress: 'Rua X, 1',
  telephone: '11999998888',
  emergencyContactName: 'Contato',
  emergencyContactTelephone: '1133334444',
  allergies: null,
  biography: 'bio curta',
  experienceInThePublicSector: 1,
  createdAt: NOW,
  updatedAt: UPDATED,
  ...over,
});

describe('mapLegacyCollaboratorRow', () => {
  it('ativo completo válido → ok Active + registrationStatus Complete', () => {
    const r = mapLegacyCollaboratorRow(base());
    assert.ok(r.ok);
    assert.equal(r.value.legacyId, 42);
    assert.equal(r.value.aggregate.status, 'Active');
    assert.equal(r.value.aggregate.registrationStatus, 'Complete');
  });

  it('mapeia status legado PRE_CADASTRO → PreRegistration', () => {
    const r = mapLegacyCollaboratorRow(base({ status: 'PRE_CADASTRO' }));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.registrationStatus, 'PreRegistration');
  });

  it('inativo com disableBy válido → Inactive preservando o motivo', () => {
    const r = mapLegacyCollaboratorRow(base({ active: 0, disableBy: 'DESLIGAMENTO_ABC' }));
    assert.ok(r.ok);
    assert.equal(r.value.aggregate.status, 'Inactive');
    if (r.value.aggregate.status === 'Inactive') {
      assert.equal(r.value.aggregate.disableBy, 'DESLIGAMENTO_ABC');
      assert.equal(r.value.aggregate.deactivatedAt.getTime(), UPDATED.getTime());
    }
  });

  it('inativo SEM disableBy → backfill LEGACY_MIGRATION (D10)', () => {
    const r = mapLegacyCollaboratorRow(base({ active: 0, disableBy: null }));
    assert.ok(r.ok);
    if (r.value.aggregate.status === 'Inactive') {
      assert.equal(r.value.aggregate.disableBy, 'LEGACY_MIGRATION');
    }
  });

  it('cpf inválido → CpfInvalid', () => {
    const r = mapLegacyCollaboratorRow(base({ cpf: '111' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'CpfInvalid'));
  });

  it('role NULL (legado) → RequiredFieldMissing role', () => {
    const r = mapLegacyCollaboratorRow(base({ role: null }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'role'));
  });

  it('biography > 2000 → Overflow (D13, nunca trunca)', () => {
    const r = mapLegacyCollaboratorRow(base({ biography: 'x'.repeat(2001) }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'Overflow' && e.field === 'biography'));
  });

  it('occupationArea desconhecido → EnumUnknown', () => {
    const r = mapLegacyCollaboratorRow(base({ occupationArea: 'XYZ' }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'EnumUnknown' && e.field === 'occupation_area'));
  });

  it('acumula cpf inválido + role ausente', () => {
    const r = mapLegacyCollaboratorRow(base({ cpf: '1', role: null }));
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'CpfInvalid'));
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'role'));
  });
});
