/**
 * PAR-COLLABORATOR-HISTORY-EXPORT (US4). Export CSV legado do histórico.
 * Cabeçalho `tipo_alteracao;historico_antes;historico_depois;data_alteracao;programa`, `;`, dd/MM/aaaa.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { collaboratorHistoryToCsv } from '#src/modules/partners/adapters/export/collaborator-history-csv.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/application/ports/collaborator-history.ts';

const entry = (over: Partial<CollaboratorHistoryEntry>): CollaboratorHistoryEntry => ({
  id: 'h1',
  collaboratorId: 'c1',
  eventType: 'CollaboratorEdited',
  fieldName: 'role',
  fieldLabel: 'Cargo',
  valueBefore: 'Diretor',
  valueAfter: 'Diretor Adjunto',
  occurredAt: new Date('2026-01-10T08:00:00.000Z'),
  ...over,
});

describe('collaboratorHistoryToCsv (US4)', () => {
  it('cabeçalho legado + separador ; + coluna programa vazia', () => {
    const csv = collaboratorHistoryToCsv([]);
    assert.ok(
      csv.includes('tipo_alteracao;historico_antes;historico_depois;data_alteracao;programa'),
    );
  });

  it('CA2: uma linha por alteração, data dd/MM/aaaa, programa vazia', () => {
    const csv = collaboratorHistoryToCsv([entry({})]);
    assert.ok(
      csv.includes('Cargo;Diretor;Diretor Adjunto;10/01/2026;'),
      `linha legada ausente:\n${csv}`,
    );
  });

  it('valor com ; é quotado (RFC 4180 com separador ;)', () => {
    const csv = collaboratorHistoryToCsv([entry({ valueAfter: 'A; B' })]);
    assert.ok(csv.includes('"A; B"'), `quoting de ; ausente:\n${csv}`);
  });
});
