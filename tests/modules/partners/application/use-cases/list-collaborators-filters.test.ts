/**
 * COLLABORATORS-HTTP-LIST-FILTERS-PARITY (P1c) — W0 (RED) — collaboratorMatchesFilter estendido.
 *
 * DEVE FALHAR: `CollaboratorListFilter`/`collaboratorMatchesFilter` ainda não conhecem
 * genderIdentities/races/educations/disableReasons/roles/yearOfContract — a impl atual
 * IGNORA esses campos e retorna `true` (não restringe), então os casos negativos falham.
 * GREEN quando o W1 estender o predicado (puro). Filtros são passados via variável (não
 * literal fresco) para que o teste compile no W0 e fique type-safe no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { collaboratorMatchesFilter } from '#src/modules/partners/application/use-cases/list-collaborators.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const register = (cpf: string, role: string, year: number): CollaboratorEntity => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Fulano',
    email: `${cpf}@bemcomum.org`,
    cpf,
    occupationArea: 'PARC',
    role,
    startOfContract: new Date(`${year}-03-01T00:00:00.000Z`),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const complete = (base: CollaboratorEntity): CollaboratorEntity => {
  const r = Collaborator.completeRegistration(
    base,
    {
      rg: null,
      dateOfBirth: null,
      genderIdentity: 'MULHER_CIS',
      race: 'PARDO',
      education: 'ENSINO_SUPERIOR',
      foodCategory: null,
      foodCategoryDescription: null,
      completeAddress: null,
      telephone: null,
      emergencyContactName: null,
      emergencyContactTelephone: null,
      allergies: null,
      biography: null,
      experienceInThePublicSector: null,
    },
    NOW,
  );
  assert.ok(r.ok, `complete: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('collaboratorMatchesFilter (P1c) — filtros estendidos', () => {
  const completo = complete(register('11144477735', 'Analista', 2026));

  it('genderIdentities: casa MULHER_CIS, não casa HOMEM_CIS', () => {
    assert.equal(collaboratorMatchesFilter(completo, { genderIdentities: ['MULHER_CIS'] }), true);
    assert.equal(collaboratorMatchesFilter(completo, { genderIdentities: ['HOMEM_CIS'] }), false);
  });

  it('races: casa PARDO, não casa BRANCO', () => {
    assert.equal(collaboratorMatchesFilter(completo, { races: ['PARDO'] }), true);
    assert.equal(collaboratorMatchesFilter(completo, { races: ['BRANCO'] }), false);
  });

  it('educations: casa ENSINO_SUPERIOR, não casa MESTRADO', () => {
    assert.equal(collaboratorMatchesFilter(completo, { educations: ['ENSINO_SUPERIOR'] }), true);
    assert.equal(collaboratorMatchesFilter(completo, { educations: ['MESTRADO'] }), false);
  });

  it('roles: casa Analista, não casa Gestor', () => {
    assert.equal(collaboratorMatchesFilter(completo, { roles: ['Analista'] }), true);
    assert.equal(collaboratorMatchesFilter(completo, { roles: ['Gestor'] }), false);
  });

  it('yearOfContract: casa 2026, não casa 2025', () => {
    assert.equal(collaboratorMatchesFilter(completo, { yearOfContract: 2026 }), true);
    assert.equal(collaboratorMatchesFilter(completo, { yearOfContract: 2025 }), false);
  });

  it('campo pessoal null não casa filtro de valor', () => {
    const semGenero = register('52998224725', 'Analista', 2026); // PreRegistration: genderIdentity null
    assert.equal(collaboratorMatchesFilter(semGenero, { genderIdentities: ['MULHER_CIS'] }), false);
  });

  it('disableReasons: casa o motivo do inativo; ativo não casa', () => {
    const ativo = register('39053344705', 'Analista', 2026);
    const deact = Collaborator.deactivate(ativo, 'SOLICITACAO_RESCISAO_CONTRATUAL', NOW);
    assert.ok(deact.ok, `deactivate: ${deact.ok ? '' : deact.error}`);
    const inativo = deact.value.collaborator;
    assert.equal(
      collaboratorMatchesFilter(inativo, { disableReasons: ['SOLICITACAO_RESCISAO_CONTRATUAL'] }),
      true,
    );
    assert.equal(collaboratorMatchesFilter(inativo, { disableReasons: ['FALECIMENTO'] }), false);
    assert.equal(
      collaboratorMatchesFilter(ativo, { disableReasons: ['SOLICITACAO_RESCISAO_CONTRATUAL'] }),
      false,
    );
  });
});
