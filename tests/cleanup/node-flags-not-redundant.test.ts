/**
 * NODE-FLAGS-NOT-REDUNDANTE — nenhum script do `package.json` passa flag que o Node 24 já dá.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * DUAS flags que 45 dos 64 scripts carregavam foram medidas no runtime do `devEngines` (24.21.0)
 * em 06/10/2026 e não faziam diferença:
 *
 *   `--experimental-strip-types`  O stripping é DEFAULT desde o Node 23.6 (backport em 22.18) — a
 *                                 prova no `--help` é existir `--no-strip-types` como negação. O
 *                                 repositório tem **zero** `enum` e **zero** `namespace`, então
 *                                 nada aqui precisaria de `--experimental-transform-types`.
 *   `--no-warnings`               Existia para silenciar o `ExperimentalWarning` do stripping. Sem
 *                                 a flag, a execução de script real e de `node --test` emite
 *                                 **zero** linha em stderr. Mantê-la passou a significar engolir
 *                                 `DeprecationWarning` futuro em 45 comandos — o canal pelo qual
 *                                 o Node anuncia o que quebra na próxima major.
 *
 * ## `--enable-source-maps` NÃO entra nesta lista, e a correção é o registro mais útil deste
 * ## arquivo
 *
 * A primeira versão deste gate também a proibia, com a justificativa de que "nenhuma das 10
 * dependências de produção publica `.js.map`". **Era falso, e por erro de medição:** o `find`
 * rodou sem `-L`, e `node_modules/<dep>` é SYMLINK sob pnpm — a varredura nunca desceu no alvo.
 * Medido de novo com `find -L`: `drizzle-orm` publica **444** arquivos `.js.map` e
 * `fast-xml-parser` mais 4.
 *
 * O efeito é real e reproduzível num erro lançado dentro da lib:
 *
 *   sem a flag:  at getTableColumns (…/drizzle-orm/utils.js:109:15)
 *   com a flag:  at getTableColumns (…/drizzle-orm/src/utils.ts:208:9)
 *
 * O raciocínio original — "o stripping preserva a posição no `.ts`" — está certo para o código
 * DESTE repositório, e é justamente por isso que enganou: a flag nunca serviu a ele. Serve às
 * dependências que publicam mapa, e `drizzle-orm` é a mais usada do projeto (183 imports). Por
 * isso ela FICA em todo comando, e um gate que a proibisse travaria a volta de algo necessário.
 *
 * Este gate existe porque flag redundante não dá sintoma: não falha, não avisa e é copiada por
 * imitação do script vizinho — foi assim que chegou a 45. Ver
 * [ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md)
 * para a disciplina de subida de runtime que torna o aviso de depreciação acionável.
 *
 * A varredura cobre o `package.json` **e** os demais pontos que invocam `node`, porque a flag
 * morava neles também — `Procfile` e `.githooks/` entre eles. Cobrir só o manifesto deixaria a
 * `rules/testing.md` prometendo por escrito uma garantia que o gate não dava.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readSource } from '../support/source-scan.ts';

/** Flag → por que o Node 24 a tornou redundante, na mensagem que quem for mexer vai ler. */
const REDUNDANT: Readonly<Record<string, string>> = {
  '--experimental-strip-types':
    'o stripping é default desde o Node 23.6 (o `--help` lista `--no-strip-types` como negação) e ' +
    'o repo não tem enum nem namespace',
  '--no-warnings':
    'sem o ExperimentalWarning do stripping não sobra aviso algum para silenciar — e a flag ' +
    'engoliria DeprecationWarning, que é como o Node anuncia o que quebra na próxima major',
};

/**
 * Onde a flag morava, além do manifesto. São os pontos que INVOCAM `node`; documentação fica de
 * fora porque `handbook/specs/` e `handbook/interviews/` são acervo datado, onde a citação da
 * flag é registro histórico e não instrução.
 *
 * O critério de entrada é EXECUTAR o runtime, não citá-lo: `block-npm.sh` e
 * `block-inline-interpreter.sh` falam de `node` e `pnpm` dezenas de vezes no texto de ajuda que
 * imprimem, e nenhuma dessas linhas invoca coisa alguma. Lista por menção acusaria justamente os
 * arquivos que explicam a norma — a mesma armadilha que o `codeLines` abaixo registra.
 *
 * ⚠️ A lista é mantida à mão, e o caso `todo ponto de invocação listado existe` só guarda contra
 * entrada MORTA — nada guarda contra entrada AUSENTE. Os três hooks de `.claude/hooks/` entraram
 * em 06/10 por terem sido encontrados numa revisão, não pelo gate.
 */
const INVOCATION_POINTS: readonly string[] = [
  'package.json',
  'Dockerfile',
  'Procfile',
  'compose.yaml',
  'scripts/ci/test-integration.ts',
  'scripts/e2e/auth.sh',
  'scripts/e2e/collaborators.sh',
  'scripts/e2e/contracts.sh',
  '.githooks/commit-msg',
  '.claude/hooks/pre-commit-tombstone.sh',
  '.claude/hooks/regen-inquiry-index.sh',
  '.claude/hooks/pre-commit-typecheck.sh',
  '.claude/hooks/stop-quality-gate.sh',
  '.claude/hooks/prettier-write.sh',
];

const scripts = (): Readonly<Record<string, string>> =>
  (JSON.parse(readSource('package.json')) as { scripts: Record<string, string> }).scripts;

/**
 * Linhas de CÓDIGO do arquivo — comentário fora.
 *
 * A distinção não é preciosismo: na primeira execução deste gate ampliado, `Dockerfile` e
 * `scripts/ci/test-integration.ts` foram acusados porque **documentam** a remoção das flags em
 * comentário. Um gate que varre por nome reprova justamente o arquivo que explica a norma — a
 * armadilha que `tests/support/source-scan.ts` registra no próprio docstring, e que este gate
 * repetiu por usar `includes` sobre o texto cru.
 *
 * Cobre as duas sintaxes dos pontos de invocação: `#` (Dockerfile, shell, Procfile, YAML) e `//`
 * (TypeScript). O `package.json` não tem comentário e passa inteiro, como deve.
 */
const codeLines = (path: string): readonly string[] =>
  readSource(path)
    .split('\n')
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith('#') && !t.startsWith('//') && !t.startsWith('*');
    });

const usesFlag = (path: string, flag: string): boolean =>
  codeLines(path).some((line) => line.includes(flag));

describe('NODE-FLAGS — nenhum ponto de invocação passa flag que o Node 24 já dá', () => {
  for (const [flag, why] of Object.entries(REDUNDANT)) {
    it(`${flag} não aparece em ponto de invocação algum`, () => {
      const offenders = INVOCATION_POINTS.filter((path) => usesFlag(path, flag)).sort();
      assert.deepEqual(
        offenders,
        [],
        `${offenders.length} arquivo(s) passam \`${flag}\`: ${offenders.join(', ')}.\n` +
          `Redundante porque ${why}.`,
      );
    });
  }

  /**
   * Entrada morta na lista é tão ruim quanto ponto não coberto: o arquivo some, o `readSource`
   * estoura, e quem for mexer culpa o gate em vez da lista. A `rules/testing.md` afirma que a
   * remoção vale para TODO comando do repositório — esta lista é o que sustenta a frase.
   */
  it('todo ponto de invocação listado existe', () => {
    const missing = INVOCATION_POINTS.filter((path) => {
      try {
        readSource(path);
        return false;
      } catch {
        return true;
      }
    });
    assert.deepEqual(
      missing,
      [],
      `caminho(s) na lista que não existem mais: ${missing.join(', ')}. Remover da lista ou ` +
        'corrigir o caminho — entrada morta faz o gate falhar por motivo errado.',
    );
  });

  /**
   * Guarda contra verde por vacuidade. Sem ela, renomear `scripts` no manifesto (ou um erro de
   * leitura que devolvesse `{}`) deixaria os casos acima passando por não encontrar nada — o modo
   * de falha que `node-version-single-source.test.ts` já pagou uma vez.
   */
  it('há scripts invocando `node` para varrer', () => {
    const nodeScripts = Object.entries(scripts()).filter(([, b]) => b.startsWith('node '));
    assert.ok(
      nodeScripts.length > 0,
      'nenhum script do package.json começa com `node ` — ou o manifesto mudou de forma, ou a ' +
        'leitura falhou, e os casos acima passariam sem verificar nada.',
    );
  });
});
