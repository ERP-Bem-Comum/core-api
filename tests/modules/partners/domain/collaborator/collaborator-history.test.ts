/**
 * #44 — W0/W1 — VO `CollaboratorHistoryEntry` + snapshot determinístico e agnóstico.
 *
 * CA5 (snapshot agnóstico): `snapshotOf` serializa o agregado varrendo as chaves; um campo
 * novo no agregado entra no snapshot SEM mudança de schema (provado por chave sintética).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as CollaboratorHistoryId from '#src/modules/partners/domain/collaborator/collaborator-history-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorType } from '#src/modules/partners/domain/collaborator/types.ts';
import { snapshotOf } from '#src/modules/partners/domain/collaborator/collaborator-snapshot.ts';
import { make } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';

const NOW = new Date('2026-06-01T12:00:00.000Z');
const START = new Date('2025-02-01T00:00:00.000Z');

const makeActive = (over: Record<string, unknown> = {}): CollaboratorType => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email: 'maria@bemcomum.org',
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Diretor',
    startOfContract: START,
    employmentRelationship: 'CLT',
    registeredAt: NOW,
    ...over,
  });
  assert.ok(r.ok, `fixture inválido: ${r.ok ? '' : r.error}`);
  return r.value.collaborator;
};

describe('#44 snapshotOf — determinístico e agnóstico', () => {
  it('inclui role no formato key=value', () => {
    const snap = snapshotOf(makeActive({ role: 'Diretor' }));
    assert.ok(snap.includes('role=Diretor'), `snapshot sem role:\n${snap}`);
  });

  it('é determinístico (mesmo agregado → mesma string)', () => {
    const c = makeActive();
    assert.equal(snapshotOf(c), snapshotOf(c));
  });

  it('reflete a mudança de um campo (role Diretor vs Diretor Adjunto)', () => {
    const before = snapshotOf(makeActive({ role: 'Diretor' }));
    const after = snapshotOf(makeActive({ role: 'Diretor Adjunto' }));
    assert.ok(before.includes('role=Diretor'));
    assert.ok(after.includes('role=Diretor Adjunto'));
    assert.notEqual(before, after);
  });

  it('CA5: campo novo no agregado entra no snapshot sem schema novo', () => {
    // Simula a trilha A adicionando um campo ao agregado: chave sintética no objeto.
    const c = makeActive() as unknown as Record<string, unknown>;
    const extended = { ...c, programLink: 'PROG-123' } as unknown as CollaboratorType;
    const snap = snapshotOf(extended);
    assert.ok(snap.includes('programLink=PROG-123'), `snapshot sem campo novo:\n${snap}`);
  });
});

describe('#44 CollaboratorHistoryEntry.make', () => {
  it('monta a entry com before/after e occurredAt; changedByRef default null', () => {
    const c = makeActive();
    const entry = make({
      id: CollaboratorHistoryId.generate(),
      collaboratorRef: c.id,
      changeType: 'Edicao',
      before: snapshotOf(c),
      after: snapshotOf(makeActive({ role: 'Diretor Adjunto' })),
      occurredAt: NOW,
    });
    assert.equal(entry.changeType, 'Edicao');
    assert.equal(entry.changedByRef, null);
    assert.equal(entry.occurredAt.getTime(), NOW.getTime());
    assert.ok(entry.before?.includes('role=Diretor'));
    assert.ok(entry.after.includes('role=Diretor Adjunto'));
  });

  it('rejeita CollaboratorHistoryId mal-formado no rehydrate', () => {
    const bad = CollaboratorHistoryId.rehydrate('nao-uuid');
    assert.equal(bad.ok, false);
  });
});
