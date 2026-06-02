import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorType } from '#src/modules/partners/domain/collaborator/types.ts';
import { makeInMemoryCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.in-memory.ts';
import type { CollaboratorRepository } from '#src/modules/partners/domain/collaborator/repository.ts';
import {
  listCollaborators,
  collaboratorMatchesFilter,
} from '#src/modules/partners/application/use-cases/list-collaborators.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const register = (over: Record<string, unknown>): CollaboratorType => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
    ...over,
  });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

const maria = () => register({});
const joao = () =>
  register({
    name: 'João Pereira',
    email: 'joao@bemcomum.org',
    cpf: '529.982.247-25',
    occupationArea: 'DDI',
    employmentRelationship: 'PJ',
  });

describe('collaboratorMatchesFilter — vazio', () => {
  it('filtro vazio não restringe', () => {
    assert.equal(collaboratorMatchesFilter(maria(), {}), true);
  });
});

describe('collaboratorMatchesFilter — search nameOrCPF', () => {
  it('casa por nome (substring case-insensitive)', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { search: 'maria' }), true);
    assert.equal(collaboratorMatchesFilter(maria(), { search: 'SILVA' }), true);
  });

  it('casa por CPF com máscara (só dígitos)', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { search: '111.444' }), true);
  });

  it('casa por CPF sem máscara', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { search: '11144477735' }), true);
  });

  it('texto que não bate nome nem CPF → exclui', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { search: 'ricardo' }), false);
  });
});

describe('collaboratorMatchesFilter — enums', () => {
  it('statuses exclui o que não está na lista', () => {
    const r = Collaborator.deactivate(maria(), 'FALECIMENTO', NOW);
    assert.ok(r.ok);
    const inactive = r.value.collaborator;
    assert.equal(collaboratorMatchesFilter(inactive, { statuses: ['Active'] }), false);
    assert.equal(collaboratorMatchesFilter(inactive, { statuses: ['Inactive'] }), true);
  });

  it('registrationStatuses filtra PreRegistration/Complete', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { registrationStatuses: ['Complete'] }), false);
    assert.equal(
      collaboratorMatchesFilter(maria(), { registrationStatuses: ['PreRegistration'] }),
      true,
    );
  });

  it('occupationAreas filtra por área', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { occupationAreas: ['DDI'] }), false);
    assert.equal(collaboratorMatchesFilter(joao(), { occupationAreas: ['DDI'] }), true);
  });

  it('employmentRelationships filtra por vínculo', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { employmentRelationships: ['PJ'] }), false);
    assert.equal(collaboratorMatchesFilter(joao(), { employmentRelationships: ['PJ'] }), true);
  });
});

describe('collaboratorMatchesFilter — composição', () => {
  it('AND entre campos: nome casa mas status não inclui → exclui', () => {
    assert.equal(
      collaboratorMatchesFilter(maria(), { search: 'maria', statuses: ['Inactive'] }),
      false,
    );
  });

  it('array vazio não restringe', () => {
    assert.equal(collaboratorMatchesFilter(maria(), { occupationAreas: [] }), true);
  });
});

describe('listCollaborators — use case com filtro (InMemory)', () => {
  let repo: CollaboratorRepository;

  beforeEach(async () => {
    repo = makeInMemoryCollaboratorStore().repository;
    await repo.save(maria());
    await repo.save(joao());
  });

  it('sem argumento retorna todos', async () => {
    const r = await listCollaborators({ collaboratorRepo: repo })();
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 2);
  });

  it('filtra por occupationArea', async () => {
    const r = await listCollaborators({ collaboratorRepo: repo })({ occupationAreas: ['DDI'] });
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.length, 1);
      assert.equal(r.value[0]?.name, 'João Pereira');
    }
  });

  it('filtra por search de nome', async () => {
    const r = await listCollaborators({ collaboratorRepo: repo })({ search: 'silva' });
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 1);
  });
});
