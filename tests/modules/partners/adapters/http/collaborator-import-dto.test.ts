/**
 * PARTNERS-COLLAB-IMPORT-HTTP — W0 (RED) — mapeamento CSV → RegisterCollaboratorCommand.
 *
 * DEVE FALHAR: `parseCollaboratorImportCsv` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseCollaboratorImportCsv } from '#src/modules/partners/adapters/http/collaborator-import-dto.ts';

const HEADER = 'name,email,cpf,occupationArea,role,startOfContract,employmentRelationship';

describe('parseCollaboratorImportCsv', () => {
  it('mapeia linha válida → command com startOfContract: Date e registra a linha de origem', () => {
    const r = parseCollaboratorImportCsv(
      `${HEADER}\nMaria Silva,maria@bemcomum.org,11144477735,PARC,Analista,2026-01-10,CLT`,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.commands.length, 1);
    const cmd = r.value.commands[0]!;
    assert.equal(cmd.name, 'Maria Silva');
    assert.equal(cmd.cpf, '11144477735');
    assert.ok(cmd.startOfContract instanceof Date);
    assert.deepEqual(r.value.lineOf, [2]); // header = linha 1
    assert.equal(r.value.mappingFailures.length, 0);
  });

  it('coluna obrigatória ausente/vazia → mappingFailure na linha certa (não vira command)', () => {
    const r = parseCollaboratorImportCsv(
      `${HEADER}\nSem CPF,semcpf@bemcomum.org,,PARC,Analista,2026-01-10,CLT`,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.commands.length, 0);
    assert.equal(r.value.mappingFailures.length, 1);
    assert.equal(r.value.mappingFailures[0]!.line, 2);
  });

  it('data de início inválida → mappingFailure', () => {
    const r = parseCollaboratorImportCsv(
      `${HEADER}\nData Ruim,data@bemcomum.org,11144477735,PARC,Analista,nao-e-data,CLT`,
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.commands.length, 0);
    assert.equal(r.value.mappingFailures[0]!.error.includes('start-of-contract'), true);
  });

  it('propaga csv-empty / csv-malformed do parseCsv', () => {
    assert.equal(parseCollaboratorImportCsv('').ok, false);
    const mal = parseCollaboratorImportCsv(`${HEADER}\n"sem fim`);
    assert.equal(mal.ok, false);
    if (!mal.ok) assert.equal(mal.error, 'csv-malformed');
  });
});
