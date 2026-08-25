/**
 * Teste do helper de varredura. A asserção central usa um caso REAL do repositório em vez de
 * fixture sintética: `src/jobs/contracts/sweeper/run.ts:4` escreve "SEM AbortController / SIGTERM
 * listener" num comentário, para ensinar a regra do job one-shot. É exatamente o arquivo que um
 * padrão ingênuo acusaria — e o que separa `filesContaining` de `filesUsing`.
 *
 * Se o comentário do sweeper for reescrito um dia, este teste falha e aponta para cá. É o
 * comportamento desejado: a fixture é real, então ela envelhece junto com o repositório.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import {
  PROJECT_ROOT,
  filesContaining,
  filesUsing,
  importSpecifiers,
  isCommentLine,
  walkFiles,
} from './source-scan.ts';

const JOBS = join(PROJECT_ROOT, 'src', 'jobs');

describe('source-scan — uso × menção', () => {
  it('filesContaining ACHA o nome citado em comentário', () => {
    const found = filesContaining(JOBS, 'AbortController', { ext: '.ts' });
    assert.ok(
      found.includes('src/jobs/contracts/sweeper/run.ts'),
      'o sweeper cita AbortController num comentário; filesContaining deve enxergá-lo',
    );
  });

  it('filesUsing IGNORA o mesmo nome quando só aparece em comentário', () => {
    const used = filesUsing(JOBS, 'new AbortController(', { ext: '.ts' });
    assert.deepEqual(used, [], 'nenhum job instancia AbortController — só menciona em comentário');
  });

  it('isCommentLine reconhece as três formas', () => {
    assert.equal(isCommentLine('  // nota'), true);
    assert.equal(isCommentLine('   * nota de bloco'), true);
    assert.equal(isCommentLine('/* abre bloco'), true);
    assert.equal(isCommentLine('const x = 1; // com código antes'), false);
  });
});

describe('source-scan — walk e imports', () => {
  it('walkFiles filtra por extensão e devolve paths relativos posix', () => {
    const files = walkFiles(JOBS, { ext: '.ts' });
    assert.ok(files.length > 0, 'src/jobs/ deveria ter arquivos .ts');
    assert.ok(
      files.every((f) => f.startsWith('src/jobs/') && f.endsWith('.ts') && !f.includes('\\')),
      'todo caminho deve ser relativo ao projeto, posix, e .ts',
    );
  });

  it('walkFiles sem `ext` devolve todo arquivo', () => {
    const all = walkFiles(join(PROJECT_ROOT, 'src', 'shared', 'primitives'));
    const onlyTs = walkFiles(join(PROJECT_ROOT, 'src', 'shared', 'primitives'), { ext: '.ts' });
    assert.ok(all.length >= onlyTs.length);
  });

  it('importSpecifiers lê o que vem depois de `from`, não texto solto', () => {
    const specs = importSpecifiers('src/shared/persistence/pool-registry.ts');
    assert.ok(specs.includes('mysql2/promise'), `esperado mysql2/promise em ${specs.join(', ')}`);
    assert.ok(
      specs.every((s) => !s.startsWith('//')),
      'nenhum specifier pode vir de comentário',
    );
  });
});
