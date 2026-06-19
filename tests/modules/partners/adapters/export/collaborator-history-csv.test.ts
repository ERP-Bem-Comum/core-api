/**
 * #126 — Export CSV do histórico no formato LEGADO de 9 colunas (lista + detalhe).
 * Cabeçalho `nome;email;cpf;programa;inicio_contrato;tipo_alteracao;historico_antes;historico_depois;data_alteracao`.
 * Identidade do colaborador por linha; separador `;`; datas dd/MM/aaaa (UTC).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  collaboratorHistoryToCsv,
  type CollaboratorHistoryGroup,
} from '#src/modules/partners/adapters/export/collaborator-history-csv.ts';
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

const group = (over: Partial<CollaboratorHistoryGroup> = {}): CollaboratorHistoryGroup => ({
  identity: {
    name: 'Cazé TV',
    email: 'leka.devcode@gmail.com',
    cpf: '36482046100',
    programa: 'DCE',
    startOfContract: new Date('2026-06-03T00:00:00.000Z'),
  },
  entries: [entry({})],
  ...over,
});

const HEADER =
  'nome;email;cpf;programa;inicio_contrato;tipo_alteracao;historico_antes;historico_depois;data_alteracao';

describe('collaboratorHistoryToCsv (#126 — 9 colunas)', () => {
  it('cabeçalho legado de 9 colunas', () => {
    assert.ok(collaboratorHistoryToCsv([]).includes(HEADER));
  });

  it('linha combina identidade + alteração (programa preenchido, inicio_contrato dd/MM/aaaa)', () => {
    const csv = collaboratorHistoryToCsv([group()]);
    assert.ok(
      csv.includes(
        'Cazé TV;leka.devcode@gmail.com;36482046100;DCE;03/06/2026;Cargo;Diretor;Diretor Adjunto;10/01/2026',
      ),
      `linha de 9 colunas ausente:\n${csv}`,
    );
  });

  it('multi-colaborador: uma linha por (colaborador × alteração)', () => {
    const csv = collaboratorHistoryToCsv([
      group(),
      group({
        identity: {
          name: 'kauan',
          email: 'kauanoliveira@abemcomum.org',
          cpf: '08444178314',
          programa: 'PARC',
          startOfContract: new Date('2026-06-06T00:00:00.000Z'),
        },
        entries: [entry({ fieldLabel: 'Admissão', valueBefore: null, valueAfter: '06/06/2026' })],
      }),
    ]);
    const lines = csv.trim().split('\n');
    assert.equal(lines.length, 3); // header + 2 linhas
    assert.ok(
      csv.includes(
        'kauan;kauanoliveira@abemcomum.org;08444178314;PARC;06/06/2026;Admissão;;06/06/2026;',
      ),
    );
  });

  it('valor com ; é quotado (RFC 4180 com separador ;)', () => {
    const csv = collaboratorHistoryToCsv([group({ entries: [entry({ valueAfter: 'A; B' })] })]);
    assert.ok(csv.includes('"A; B"'), `quoting de ; ausente:\n${csv}`);
  });
});
