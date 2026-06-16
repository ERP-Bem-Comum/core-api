/**
 * #44 — W0/W1 — use case `listCollaboratorHistory` com InMemory reader.
 *
 * CA4: 3 alterações → 3 entries DESC; id desconhecido → lista vazia; id mal-formado → erro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as CollaboratorHistoryId from '#src/modules/partners/domain/collaborator/collaborator-history-id.ts';
import { make } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import { makeInMemoryCollaboratorHistoryStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-history-repository.in-memory.ts';
import { listCollaboratorHistory } from '#src/modules/partners/application/use-cases/list-collaborator-history.ts';

const collaboratorRef = CollaboratorId.generate();

const entry = (changeType: CollaboratorHistoryEntry['changeType'], at: string) =>
  make({
    id: CollaboratorHistoryId.generate(),
    collaboratorRef,
    changeType,
    before: 'role=A',
    after: 'role=B',
    occurredAt: new Date(at),
  });

describe('#44 listCollaboratorHistory', () => {
  it('CA4: 3 alterações → 3 entries ordenadas por occurredAt DESC', async () => {
    const store = makeInMemoryCollaboratorHistoryStore([
      entry('Edicao', '2026-01-01T00:00:00.000Z'),
      entry('Desativacao', '2026-03-01T00:00:00.000Z'),
      entry('Reativacao', '2026-02-01T00:00:00.000Z'),
    ]);
    const run = listCollaboratorHistory({ historyReader: store.reader });
    const res = await run({ collaboratorId: String(collaboratorRef) });
    assert.ok(res.ok);
    assert.equal(res.value.length, 3);
    assert.equal(res.value[0]?.changeType, 'Desativacao'); // mais recente
    assert.equal(res.value[1]?.changeType, 'Reativacao');
    assert.equal(res.value[2]?.changeType, 'Edicao');
  });

  it('CA4: id sem histórico → lista vazia', async () => {
    const store = makeInMemoryCollaboratorHistoryStore();
    const run = listCollaboratorHistory({ historyReader: store.reader });
    const res = await run({ collaboratorId: String(CollaboratorId.generate()) });
    assert.ok(res.ok);
    assert.equal(res.value.length, 0);
  });

  it('CA4: id mal-formado (não-UUID) → erro invalid-id', async () => {
    const store = makeInMemoryCollaboratorHistoryStore();
    const run = listCollaboratorHistory({ historyReader: store.reader });
    const res = await run({ collaboratorId: 'nao-uuid' });
    assert.equal(res.ok, false);
    assert.equal(res.ok ? '' : res.error, 'list-collaborator-history-invalid-id');
  });

  it('CA3: reader indisponível → propaga collaborator-repo-unavailable', async () => {
    const run = listCollaboratorHistory({
      historyReader: {
        listByCollaborator: () =>
          Promise.resolve({ ok: false as const, error: 'collaborator-repo-unavailable' as const }),
      },
    });
    const res = await run({ collaboratorId: String(collaboratorRef) });
    assert.equal(res.ok, false);
    assert.equal(res.ok ? '' : res.error, 'collaborator-repo-unavailable');
  });
});
