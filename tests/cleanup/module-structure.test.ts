/**
 * MODULE-STRUCTURE — onde módulo, transversal e composition root vivem.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma (`ADR-0006-C2`, promovida a `accepted` em 2026-08-05): módulo vive em
 * `src/modules/<nome-en>/` com nome em inglês e kebab-case; código transversal em `src/shared/`; o
 * composition root da borda é `src/server.ts`.
 *
 * Este gate existe porque a alegação original do ADR-0006 descrevia uma ÁRVORE DE DIRETÓRIOS —
 * `apps/core-api/src/contexts/{documentos,titulos,banco,ocr}/` — escrita em abril, antes de existir
 * código. Nenhuma parte dela sobreviveu: não há `apps/` nem `packages/`, `contexts/` virou `modules/`,
 * o vocabulário passou de PT para EN e os 4 BCs projetados viraram 8 módulos. A estrutura real é
 * seguida por todos os 8 sem exceção, ou seja, já era norma de fato — só não era cobrada por nada.
 *
 * A lição que o gate embute: descrição de estrutura em prosa apodrece em silêncio. O que impede a
 * reincidência não é reescrever o texto com os nomes certos, é a árvore passar a ser verificada.
 *
 * O gate assere PROPRIEDADE, nunca contagem: um módulo novo legítimo não pode reprová-lo. Por isso
 * não há assert de "8 módulos" nem lista fechada de nomes.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { PROJECT_ROOT } from '../support/source-scan.ts';

/** kebab-case ASCII minúsculo: `auth`, `budget-plans`. Rejeita camelCase, `_`, acento, maiúscula. */
const KEBAB_EN = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

/**
 * A projeção inicial do ADR, que nunca existiu — e que um monorepo mal-copiado reintroduziria.
 * `packages/` e `apps/` aparecem em TRÊS alegações do acervo (ADR-0006-C2, ADR-0010-C6, ADR-0056),
 * o que mostra que a projeção foi copiada entre documentos sem ninguém conferir a árvore.
 */
const FOSSIL_DIRS = ['apps', 'packages', join('src', 'contexts')];

const moduleNames = (): readonly string[] =>
  readdirSync(join(PROJECT_ROOT, 'src', 'modules')).filter((n) =>
    statSync(join(PROJECT_ROOT, 'src', 'modules', n)).isDirectory(),
  );

describe('MODULE-STRUCTURE — a árvore que o ADR-0006 descreve é a que existe', () => {
  it('todo módulo vive em src/modules/<nome>/ com nome kebab-case em ASCII minúsculo', () => {
    const offenders = moduleNames()
      .filter((n) => !KEBAB_EN.test(n))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      'Nome de módulo fora da convenção — o vocabulário do código é EN kebab-case ' +
        '(`.claude/rules/` e a tabela de idioma do CLAUDE.md):\n' +
        offenders.join('\n'),
    );
  });

  it('o código transversal vive em src/shared/', () => {
    assert.ok(
      existsSync(join(PROJECT_ROOT, 'src', 'shared')),
      'src/shared/ não existe — o transversal perdeu o endereço que o ADR-0006-C2 fixa',
    );
  });

  it('o composition root da borda é src/server.ts', () => {
    const server = join(PROJECT_ROOT, 'src', 'server.ts');
    assert.ok(existsSync(server), 'src/server.ts não existe — a borda perdeu o composition root');
  });

  it('a projeção de monorepo que o ADR descrevia não é reintroduzida', () => {
    const revived = FOSSIL_DIRS.filter((d) => existsSync(join(PROJECT_ROOT, d))).sort();
    assert.deepEqual(
      revived,
      [],
      'Estrutura fóssil de volta. `apps/`, `packages/` e `src/contexts/` são a projeção de abril/2026 ' +
        'que nunca existiu; a árvore real é src/{jobs,modules,shared,workers} + server.ts:\n' +
        revived.join('\n'),
    );
  });

  it('a varredura enxerga os módulos (guarda contra verde por vacuidade)', () => {
    assert.ok(
      moduleNames().length > 0,
      'nenhum módulo encontrado em src/modules/ — o gate passaria por vacuidade',
    );
  });
});
