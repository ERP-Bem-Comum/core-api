import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  decodeFinancierRow,
  decodeUserRow,
  decodeCollaboratorRow,
} from '#scripts/etl/legacy/decode.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');

describe('decode — linha mysql2 (Record<string, unknown>) → LegacyXRow', () => {
  it('financier válido decodifica com tipos corretos', () => {
    const raw = {
      id: 7,
      name: 'F',
      corporateName: 'F LTDA',
      legalRepresentative: 'R',
      cnpj: '11444777000161',
      telephone: '11',
      address: 'A',
      active: 1,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = decodeFinancierRow(raw);
    assert.ok(r.ok);
    assert.equal(r.value.id, 7);
    assert.equal(r.value.active, 1);
    assert.ok(r.value.createdAt instanceof Date);
  });

  it('zero-date (Invalid Date) → DateInvalid', () => {
    const raw = {
      id: 7,
      name: 'F',
      corporateName: 'F LTDA',
      legalRepresentative: 'R',
      cnpj: 'x',
      telephone: '11',
      address: 'A',
      active: 1,
      createdAt: new Date('0000-00-00'), // Invalid Date
      updatedAt: NOW,
    };
    const r = decodeFinancierRow(raw);
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'DateInvalid' && e.field === 'createdAt'));
  });

  it('campo obrigatório ausente/errado → RequiredFieldMissing', () => {
    const raw = { id: 7, name: 123 /* tipo errado */, createdAt: NOW, updatedAt: NOW };
    const r = decodeFinancierRow(raw);
    assert.ok(!r.ok);
    assert.ok(r.error.some((e) => e.tag === 'RequiredFieldMissing' && e.field === 'name'));
  });

  it('user: a coluna `password` NUNCA é decodificada (D6)', () => {
    const raw = {
      id: 5,
      name: 'U',
      email: 'u@e.com',
      cpf: '52998224725',
      telephone: '11',
      imageUrl: null,
      password: '$2b$10$HASHSECRETO', // presente no dump — deve ser ignorado
      active: 1,
      massApprovalPermission: 1,
      collaboratorId: 42,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = decodeUserRow(raw);
    assert.ok(r.ok);
    assert.ok(!('password' in r.value), 'password jamais no objeto decodificado');
    assert.equal(r.value.massApprovalPermission, 1);
  });

  it('collaborator: nullable e dates nulos passam; required ausente acumula', () => {
    const raw = {
      id: 1,
      name: 'C',
      email: 'c@e.com',
      cpf: '52998224725',
      occupationArea: 'PARC',
      role: null,
      startOfContract: NOW,
      employmentRelationship: 'CLT',
      status: 'PRE_CADASTRO',
      active: 1,
      disableBy: null,
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
      createdAt: NOW,
      updatedAt: NOW,
    };
    const r = decodeCollaboratorRow(raw);
    assert.ok(r.ok, 'role nullable no decode (validação de obrigatoriedade é do mapper)');
    assert.equal(r.value.role, null);
    assert.equal(r.value.dateOfBirth, null);
  });
});
