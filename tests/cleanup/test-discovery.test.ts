/**
 * TEST-DISCOVERY — todo teste escrito é teste executado.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * O runner descobre exatamente um glob: `tests/**‍/*.test.ts` (script `test` do package.json).
 * Um arquivo `.test.ts` escrito em `src/` ou `scripts/` é sintaticamente válido, passa no
 * typecheck, passa no lint — e **nunca roda**. O autor vê verde e conclui que cobriu o caso.
 *
 * Esse é o pior modo de falha de uma suíte, porque é silencioso nos dois sentidos: o teste não
 * acusa o bug que deveria pegar, e a ausência dele não acusa nada. Um teste que não roda é pior
 * que teste nenhum — teste nenhum ao menos não gera confiança falsa.
 *
 * A segunda asserção protege o outro lado da mesma moeda: os arquivos `.e2e.ts` NÃO são
 * descobertos pelo runner de propósito — rodam por `scripts/e2e/*.sh` (`pnpm run test:e2e:*`),
 * contra um servidor de verdade. Quem escrever um `.e2e.ts` esperando o gate do `pnpm test` fica
 * sem cobertura e sem aviso; mantê-los confinados a `tests/e2e/` é o que torna a distinção
 * visível no próprio caminho do arquivo.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, walkFiles } from '../support/source-scan.ts';

describe('TEST-DISCOVERY — nenhum teste fica fora do alcance do runner', () => {
  it('nenhum arquivo *.test.ts vive fora de tests/', () => {
    const offenders = ['src', 'scripts']
      .flatMap((root) => walkFiles(join(PROJECT_ROOT, root), { ext: '.test.ts' }))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Arquivo de teste fora de tests/ — o runner descobre só `tests/**/*.test.ts`, então este ' +
        'teste nunca executa e a cobertura que ele sugere é falsa:\n' +
        offenders.join('\n'),
    );
  });

  it('todo *.e2e.ts está sob tests/e2e/ (rodam por script, não pelo runner)', () => {
    const offenders = walkFiles(join(PROJECT_ROOT, 'tests'), { ext: '.e2e.ts' })
      .filter((f) => !f.startsWith('tests/e2e/'))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Arquivo .e2e.ts fora de tests/e2e/ — os e2e rodam por `pnpm run test:e2e:*` contra um ' +
        'servidor real, e não entram no `pnpm test`:\n' +
        offenders.join('\n'),
    );
  });

  it('a varredura enxerga a suíte (guarda contra verde por vacuidade)', () => {
    const total = walkFiles(join(PROJECT_ROOT, 'tests'), { ext: '.test.ts' }).length;
    assert.ok(total > 500, `esperado 500+ arquivos .test.ts em tests/, encontrado ${total}`);
  });
});
