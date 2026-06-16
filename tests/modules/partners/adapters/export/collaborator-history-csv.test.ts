/**
 * #44 — W0/W1 — formatter CSV legado do histórico.
 *
 * CA2: cabeçalho 'tipo_alteracao;antes;depois;data', separador ';', datas dd/MM/aaaa, 1 linha
 * por alteração, escape de aspas (reusa escapeCsvCell de csv.ts).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as CollaboratorHistoryId from '#src/modules/partners/domain/collaborator/collaborator-history-id.ts';
import { make } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import { collaboratorHistoryToCsv } from '#src/modules/partners/adapters/export/collaborator-history-csv.ts';

const collaboratorRef = CollaboratorId.generate();

const entry = (
  over: Partial<{
    changeType: CollaboratorHistoryEntry['changeType'];
    before: string | null;
    after: string;
    at: string;
  }> = {},
) =>
  make({
    id: CollaboratorHistoryId.generate(),
    collaboratorRef,
    changeType: over.changeType ?? 'Edicao',
    before: 'before' in over ? over.before! : 'role=Diretor',
    after: over.after ?? 'role=Diretor Adjunto',
    occurredAt: new Date(over.at ?? '2026-06-15T10:00:00.000Z'),
  });

const lines = (csv: string): readonly string[] => csv.split('\r\n').filter((l) => l.length > 0);

describe('#44 collaboratorHistoryToCsv — formato legado', () => {
  it('CA2: cabeçalho legado com separador ;', () => {
    const csv = collaboratorHistoryToCsv([]);
    const header = lines(csv)[0] ?? '';
    assert.ok(header.endsWith('tipo_alteracao;antes;depois;data'), `header: ${header}`);
  });

  it('CA2: 1 linha por alteração, separador ;', () => {
    const csv = collaboratorHistoryToCsv([entry(), entry({ changeType: 'Desativacao' })]);
    const dataLines = lines(csv).slice(1);
    assert.equal(dataLines.length, 2);
    assert.equal(dataLines[0]?.split(';').length, 4);
  });

  it('CA2: data no formato dd/MM/aaaa', () => {
    const csv = collaboratorHistoryToCsv([entry({ at: '2026-06-15T10:00:00.000Z' })]);
    const dataLine = lines(csv).slice(1)[0] ?? '';
    assert.ok(dataLine.endsWith(';15/06/2026'), `linha: ${dataLine}`);
  });

  it('CA2: célula com ; é citada (escape RFC reusado)', () => {
    const csv = collaboratorHistoryToCsv([entry({ after: 'role=A;B' })]);
    assert.ok(csv.includes('"role=A;B"'), csv);
  });

  it('CA1: before/after carregam o snapshot (role antes/depois)', () => {
    const csv = collaboratorHistoryToCsv([
      entry({ before: 'role=Diretor', after: 'role=Diretor Adjunto' }),
    ]);
    assert.ok(csv.includes('role=Diretor'));
    assert.ok(csv.includes('role=Diretor Adjunto'));
  });

  it('before null vira célula vazia', () => {
    const csv = collaboratorHistoryToCsv([entry({ before: null })]);
    const dataLine = lines(csv).slice(1)[0] ?? '';
    // tipo_alteracao;<vazio>;depois;data
    assert.ok(dataLine.startsWith('Edicao;;'), `linha: ${dataLine}`);
  });
});
