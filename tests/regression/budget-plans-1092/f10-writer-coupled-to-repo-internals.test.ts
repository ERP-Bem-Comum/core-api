// Achado 10 — o writer de cópia importava helpers internos de dois outros repositórios.
// Estrutural: lê o fonte do writer. Ocorrência = ele importa de QUALQUER `*-repository.drizzle.ts`,
// por caminho relativo (`./`, `../`) ou pelo alias `#src/...` — o acoplamento, não a grafia (R10).
// O caminho do fonte é resolvido a partir deste arquivo, não do cwd: o teste roda igual de qualquer
// diretório (worktree, script do CI). Repetir não muda o resultado; o laço só mantém o formato da
// medição.
import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { measure } from './_world.ts';

const REPO_ROOT = resolve(import.meta.dirname, '../../..');
const WRITER = resolve(
  REPO_ROOT,
  'src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.drizzle.ts',
);
const IMPORTS_A_REPOSITORY = /from '[^']*-repository\.drizzle\.ts'/;

describe('F10 — writer de cópia acoplado aos internos dos repositórios', () => {
  it('o padrão reconhece as três grafias de import (guarda contra verde por vacuidade)', () => {
    for (const line of [
      "import { x } from './budget-plan-repository.drizzle.ts';",
      "import { x } from '../repos/cost-structure-repository.drizzle.ts';",
      "import { x } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';",
    ]) {
      assert.ok(IMPORTS_A_REPOSITORY.test(line), line);
    }
    assert.ok(!IMPORTS_A_REPOSITORY.test("import { x } from './plan-writes-in-tx.drizzle.ts';"));
  });

  it('o writer não depende de helpers internos de outros repositórios', async () => {
    const m = await measure('F10', 'writer importa de *-repository.drizzle.ts', () =>
      Promise.resolve(IMPORTS_A_REPOSITORY.test(readFileSync(WRITER, 'utf8'))),
    );
    assert.equal(m.occurred, 0, `acoplamento em ${m.occurred}/${m.runs}`);
  });
});
