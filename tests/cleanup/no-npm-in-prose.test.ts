/**
 * NO-NPM-IN-PROSE — `npm` não é ensinado por escrito, só barrado na execução.
 *
 * O `block-npm.sh` recusa `npm` como COMANDO, e o `only-allow-pnpm.ts` recusa o `npm install` que
 * chega ao `preinstall`. Nenhum dos dois vê texto: um `npm run build` escrito num `.md`, num
 * comentário ou num corpo de PR atravessa o harness inteiro e chega ao leitor como instrução.
 * O anti-padrão #1 do `CLAUDE.md` já confessava o buraco — "o hook barra a execução, não o texto".
 *
 * ESCOPO — os `.md` versionados, menos `handbook/`. O handbook é ACERVO: um CHANGELOG que narra
 * "trocamos npm por pnpm" e um ADR que registra a decisão PRECISAM escrever a palavra, e reescrevê-los
 * seria editar registro histórico, que o ADR-0057 §5 proíbe. O que este gate protege é a doc que
 * INSTRUI: raiz, `.claude/`, `scripts/`, `tests/`.
 *
 * ⚠️ Uso ≠ menção, e aqui a distinção é fina. `npm` aparece legitimamente em: nome de registry
 * (`registry.npmjs.org`), campo de `package.json` (`npm-run-all`), prosa que fala DA ferramenta
 * ("o npm não é o gerenciador deste repo"). O que se proíbe é a forma IMPERATIVA — `npm install`,
 * `npm run`, `npm test`, `npm ci`, `npx` — que um leitor copia e cola.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const git = (...args: readonly string[]): readonly string[] =>
  execFileSync('git', ['-C', PROJECT_ROOT, ...args], { encoding: 'utf-8' })
    .split('\n')
    .filter((l) => l.length > 0);

/**
 * Fora do escopo, todos pela mesma razão — são REGISTRO, não instrução:
 *
 *   • `handbook/` — acervo (ver cabeçalho).
 *   • `CHANGELOG.md` da raiz — narra o passado, incluindo o dia em que o repositório usava npm.
 *   • `tests/bdd/` e `tests/reports/` — cenário BDD e artefato forense, como classifica a
 *     `.claude/rules/testing.md`. O `QA-REPORT.md` é de 2026-05-14 e documenta um
 *     `npm run cli:contracts` duplamente morto: o npm saiu pelo ADR-0029, a CLI pelo ADR-0037.
 *     Reescrever um relatório de execução para agradar um gate falsifica o registro.
 */
const ARCHIVAL = ['handbook/', 'tests/bdd/', 'tests/reports/'];
const INSTRUCTIVE = git('ls-files', '*.md').filter(
  (p) => !ARCHIVAL.some((a) => p.startsWith(a)) && p !== 'CHANGELOG.md',
);

/** Mesma isenção do `inventory-counts.test.ts`: data explícita junto marca registro, não instrução. */
const DATED = /\b(\d{1,2}\/\d{1,2}(\/\d{2,4})?|\d{4}-\d{2}-\d{2})\b/u;

/** Forma imperativa: o que um leitor copia e cola. Nome de pacote e de registry não casam. */
const IMPERATIVE = /\bnpm\s+(install|i|ci|run|test|exec|publish|audit|update|add)\b|\bnpx\s+\S/giu;

/**
 * `pnpm` na MESMA LINHA isenta. O sinal foi escolhido depois de calibrar contra as ocorrências
 * reais: quatro das cinco amostradas eram a régua ensinando a régua — "`npm install` num PR →
 * rejeitar e converter para `pnpm`", "| `npm exec node …` | `pnpm exec node …` |". Acusá-las
 * mandaria apagar justamente a linha que combate o npm.
 *
 * A quinta não tinha `pnpm` em lugar nenhum e era instrução pura: um `npm run cli:contracts` num
 * relatório de QA — npm E a CLI que o ADR-0037 retirou, no mesmo comando.
 *
 * A regra que sobra é legível numa frase: **quem escreve npm sem oferecer pnpm ao lado está
 * ensinando npm.** É deliberadamente fácil de satisfazer — e satisfazê-la já conserta o texto.
 */
const OFFERS_PNPM = /\bpnpm\b/iu;

interface Hit {
  readonly where: string;
  readonly what: string;
}

const npmInProse = (file: string): readonly Hit[] =>
  readFileSync(resolve(PROJECT_ROOT, file), 'utf-8')
    .split('\n')
    .flatMap((text, i) =>
      OFFERS_PNPM.test(text) || DATED.test(text)
        ? []
        : [...text.matchAll(IMPERATIVE)].map((m) => ({
            where: `${file}:${i + 1}`,
            what: m[0].trim(),
          })),
    );

describe('NO-NPM-IN-PROSE — a doc que instrui não ensina npm', () => {
  it('nenhum comando npm imperativo na doc versionada fora do acervo', () => {
    const hits = INSTRUCTIVE.flatMap(npmInProse)
      .map((h) => `${h.where} escreve "${h.what}"`)
      .sort();

    assert.deepEqual(
      hits,
      [],
      'doc instrutiva ensina `npm` — o hook barra a execução, e o texto passa direto para o leitor. ' +
        'Use `pnpm` (ADR-0029). Se a menção for histórica, ela pertence ao `handbook/`:\n' +
        hits.join('\n'),
    );
  });

  it('a varredura enxerga a doc instrutiva (guarda contra verde por vacuidade)', () => {
    assert.ok(
      INSTRUCTIVE.length >= 20,
      `só ${INSTRUCTIVE.length} arquivos instrutivos lidos — o \`git ls-files\` falhou e a asserção ` +
        'acima passaria sobre nada',
    );
    assert.ok(
      IMPERATIVE.test('npm install'),
      'o padrão parou de casar a forma que ele existe para pegar',
    );
  });
});
