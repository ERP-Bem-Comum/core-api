/**
 * PAR-COLLABORATOR-HISTORY-EXPORT (US4). diffCollaborator — log de atualizações por campo.
 * DEVE FALHAR no W0: `collaborator-history.ts` (diffCollaborator) ainda não existe. GREEN no W1.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import { diffCollaborator } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { Collaborator as CollaboratorEntity } from '#src/modules/partners/domain/collaborator/types.ts';

const NOW = new Date('2026-01-10T08:00:00.000Z');

const make = (role: string): CollaboratorEntity => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '11144477735',
    occupationArea: 'PARC',
    role,
    startOfContract: NOW,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `register: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('diffCollaborator (US4)', () => {
  it('CA1: mudança de cargo gera 1 change (role: Diretor → Diretor Adjunto)', () => {
    const before = make('Diretor');
    const after = { ...before, role: 'Diretor Adjunto' };
    const changes = diffCollaborator(before, after);
    const role = changes.find((c) => c.fieldName === 'role');
    assert.ok(role, 'esperava change de role');
    assert.equal(role.valueBefore, 'Diretor');
    assert.equal(role.valueAfter, 'Diretor Adjunto');
  });

  it('sem alteração → nenhuma change', () => {
    const before = make('Analista');
    assert.equal(diffCollaborator(before, before).length, 0);
  });

  it('múltiplos campos alterados → uma change por campo', () => {
    const before = make('Analista');
    const after = { ...before, role: 'Coordenador', name: 'Maria S. Andrade' };
    const changes = diffCollaborator(before, after);
    const fields = changes.map((c) => c.fieldName).sort();
    assert.deepEqual(fields, ['name', 'role']);
  });
});
