/**
 * 010-partner-contract-counts (R3) — W0 (RED) — filtro `programIds` em collaboratorMatchesFilter.
 *
 * DEVE FALHAR: `CollaboratorListFilter` ainda não conhece `programIds`; a impl atual ignora o
 * campo e não restringe. GREEN quando o W1 (T016) estender o predicado: colaborador vinculado a
 * um dos programas casa; sem vínculo (programId null) nunca casa um filtro presente; ausência do
 * filtro (ou array vazio) não restringe. Semântica OR dentro do array, AND entre campos.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { collaboratorMatchesFilter } from '#src/modules/partners/application/use-cases/list-collaborators.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');

const PROGRAM_A = '11111111-1111-4111-8111-111111111111';
const PROGRAM_B = '22222222-2222-4222-8222-222222222222';
const PROGRAM_C = '33333333-3333-4333-8333-333333333333';

const register = (cpf: string, programId: string | null): CollaboratorEntity => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Fulano',
    email: `${cpf}@bemcomum.org`,
    cpf,
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-03-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
    programId,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('collaboratorMatchesFilter (R3) — filtro programIds', () => {
  const noProgram = register('11144477735', null);
  const inA = register('52998224725', PROGRAM_A);
  const inB = register('39053344705', PROGRAM_B);

  it('casa o colaborador vinculado ao programa filtrado', () => {
    assert.equal(collaboratorMatchesFilter(inA, { programIds: [PROGRAM_A] }), true);
  });

  it('não casa colaborador vinculado a outro programa', () => {
    assert.equal(collaboratorMatchesFilter(inB, { programIds: [PROGRAM_A] }), false);
  });

  it('OR dentro do array: casa se vinculado a qualquer um dos programas', () => {
    assert.equal(collaboratorMatchesFilter(inA, { programIds: [PROGRAM_A, PROGRAM_C] }), true);
    assert.equal(collaboratorMatchesFilter(inB, { programIds: [PROGRAM_A, PROGRAM_B] }), true);
  });

  it('colaborador sem vínculo (programId null) nunca casa um filtro presente', () => {
    assert.equal(collaboratorMatchesFilter(noProgram, { programIds: [PROGRAM_A] }), false);
  });

  it('ausência do filtro não restringe (todos casam)', () => {
    assert.equal(collaboratorMatchesFilter(noProgram, {}), true);
    assert.equal(collaboratorMatchesFilter(inA, {}), true);
  });

  it('array vazio não restringe', () => {
    assert.equal(collaboratorMatchesFilter(noProgram, { programIds: [] }), true);
    assert.equal(collaboratorMatchesFilter(inB, { programIds: [] }), true);
  });
});
