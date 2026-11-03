// Achado 10 — o writer de cópia importa helpers internos de dois outros repositórios.
// Estrutural: lê o fonte do writer. Ocorrência = ele importa de `*-repository.drizzle.ts`.
// Repetir não muda o resultado; o laço existe só para manter o formato da medição.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { measure } from './_world.ts';

const WRITER = 'src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.drizzle.ts';

describe('F10 — writer de cópia acoplado aos internos dos repositórios', () => {
  it('o writer não depende de helpers internos de outros repositórios', async () => {
    const m = await measure('F10', 'writer importa de *-repository.drizzle.ts', () =>
      Promise.resolve(
        /from '\.\/[a-z-]+-repository\.drizzle\.ts'/.test(readFileSync(WRITER, 'utf8')),
      ),
    );
    assert.equal(m.occurred, 0, `acoplamento em ${m.occurred}/${m.runs}`);
  });
});
