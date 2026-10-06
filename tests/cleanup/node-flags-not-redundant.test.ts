/**
 * NODE-FLAGS-NOT-REDUNDANTE — nenhum script do `package.json` passa flag que o Node 24 já dá.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * As três flags que 45 dos 64 scripts carregavam foram medidas no runtime do `devEngines`
 * (24.21.0) em 06/10/2026, e nenhuma fazia diferença:
 *
 *   `--experimental-strip-types`  O stripping é DEFAULT desde o Node 23.6 (backport em 22.18) — a
 *                                 prova no `--help` é existir `--no-strip-types` como negação. O
 *                                 repositório tem **zero** `enum` e **zero** `namespace`, então
 *                                 nada aqui precisaria de `--experimental-transform-types`.
 *   `--no-warnings`               Existia para silenciar o `ExperimentalWarning` do stripping. Sem
 *                                 a flag, a execução de script real e de `node --test` emite
 *                                 **zero** linha em stderr. Mantê-la passou a significar engolir
 *                                 `DeprecationWarning` futuro em 45 comandos.
 *   `--enable-source-maps`        O stripping troca tipo por espaço em branco, então a posição no
 *                                 `.ts` é preservada e o stack trace sai idêntico com e sem a
 *                                 flag (medido: mesmo `arquivo.ts:27:9`). E **nenhuma** das 10
 *                                 dependências de produção publica `.js.map` — a flag não tinha
 *                                 alvo algum neste repositório.
 *
 * Este gate existe porque flag redundante não dá sintoma: ela não falha, não avisa e é copiada por
 * imitação do script vizinho — foi exatamente assim que chegou a 45. O custo não é performance, é
 * que `--no-warnings` **esconde** aviso de depreciação real, que é o canal pelo qual o Node avisa
 * o que vai quebrar na próxima major. Ver
 * [ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md)
 * para a disciplina de subida de runtime que torna essa informação acionável.
 *
 * ⚠️ Este gate cobre o `package.json` — **não** os outros pontos que invocam `node` com flag
 * (`Dockerfile`/`NODE_OPTIONS`, `compose.yaml`, `Procfile`, `scripts/e2e/*.sh`, `.githooks/`,
 * `.claude/hooks/`, spawns em `scripts/ci/test-integration.ts`). Eles são frente própria e seguem
 * citando as flags; cobrá-los aqui deixaria o gate vermelho sem que o diff do manifesto esteja
 * errado.
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
  '--enable-source-maps':
    'o stripping preserva a posição no .ts (trace idêntico com e sem a flag) e nenhuma dep de ' +
    'produção publica .js.map',
};

const scripts = (): Readonly<Record<string, string>> =>
  (JSON.parse(readSource('package.json')) as { scripts: Record<string, string> }).scripts;

describe('NODE-FLAGS — nenhum script passa flag que o Node 24 já dá por padrão', () => {
  for (const [flag, why] of Object.entries(REDUNDANT)) {
    it(`${flag} não aparece em script algum`, () => {
      const offenders = Object.entries(scripts())
        .filter(([, body]) => body.includes(flag))
        .map(([name]) => name)
        .sort();
      assert.deepEqual(
        offenders,
        [],
        `${offenders.length} script(s) passam \`${flag}\`: ${offenders.join(', ')}.\n` +
          `Redundante porque ${why}.`,
      );
    });
  }

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
