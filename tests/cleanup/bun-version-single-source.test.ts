/**
 * BUN-VERSION-SINGLE-SOURCE — a versão do Bun vive no `.bun-version`, e as demais declarações derivam.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 * Irmão direto de `node-version-single-source.test.ts`, que faz o mesmo para o Node — e herda dele
 * a disciplina do [ADR-0073](../../handbook/architecture/adr/0073-nvmrc-single-source-supersedes-0058-partial.md):
 * o número é escrito UMA vez, e o resto o lê ou é conferido contra ele.
 *
 *   `.bun-version`  → a FONTE. major.minor.patch exato
 *   `@types/bun`    → derivada, EXATA (os tipos descrevem a API de uma versão; o 1.4.4 já
 *                     divergiu da doc online — `test.extend` está na doc e não no binário)
 *   workflows       → `oven-sh/setup-bun` pinado por SHA + `bun-version-file: .bun-version`
 *
 * Por que existe: na épica `epic/bun-runtime` o `bun test` passou a ser o runner da suíte
 * (`6dd6ccb6`), e o runner de integração chama `bun` por dentro. O CI não instalava o Bun — o
 * job rodaria no que a imagem do runner trouxesse, ou falharia com ENOENT. Um gate que só
 * conferisse "há setup-bun" deixaria a versão flutuar; um que só conferisse a versão deixaria um
 * workflow novo sem setup-bun passar.
 *
 * O que NÃO cobre, e é declarado: se a versão instalada na máquina de quem roda é a do arquivo.
 * Isso depende da máquina, e gate dependente de máquina não verifica nada (rule `testing.md`).
 */

import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

/** Workflows VERSIONADOS — pergunta ao git, como o irmão do Node. */
const workflowFiles = (): readonly string[] =>
  execFileSync(
    'git',
    ['-C', PROJECT_ROOT, 'ls-files', '.github/workflows/*.yml', '.github/workflows/*.yaml'],
    { encoding: 'utf-8' },
  )
    .split('\n')
    .filter((l) => l.length > 0);

const BUN_VERSION = readSource('.bun-version').trim();
const PARSED = /^\d+\.\d+\.\d+$/.test(BUN_VERSION);

/**
 * O que, num workflow, acaba executando o binário `bun`: o `pnpm test` (script `bun test`), os
 * `test:integration*` e o runner `scripts/ci/test-integration.ts` (que faz `spawnSync('bun', …)`),
 * ou o próprio `bun`. Ancorado em `run:`/comando no início da linha, como o `RUNS_NODE` do irmão,
 * para `name: … bun …` e comentários não casarem.
 */
const RUNS_BUN =
  /^\s+(-\s+)?(run:\s*\|?.*)?\b(pnpm (run )?test\b|pnpm run test:integration|scripts\/ci\/test-integration\.ts|bun )/m;

/** Ação pinada por SHA de 40 hex (ADR-0011 §"Pin de versões"). */
const SETUP_BUN_PINNED = /uses:\s*oven-sh\/setup-bun@[0-9a-f]{40}\b/;

describe('BUN-VERSION-SINGLE-SOURCE — a fonte é legível', () => {
  it('.bun-version declara uma versão exata major.minor.patch', () => {
    assert.ok(
      PARSED,
      `.bun-version contém ${JSON.stringify(BUN_VERSION)}, que não é uma versão exata. É o arquivo ` +
        'que o `setup-bun` resolve por `bun-version-file` — uma faixa aqui devolve ao CI a ' +
        'liberdade de escolher sozinho o runtime.',
    );
  });
});

describe('BUN-VERSION-SINGLE-SOURCE — package.json deriva do .bun-version', () => {
  it('@types/bun fixa exatamente a versão do .bun-version', () => {
    const manifest = JSON.parse(readSource('package.json')) as {
      devDependencies?: Readonly<Record<string, string>>;
    };
    assert.equal(
      manifest.devDependencies?.['@types/bun'],
      BUN_VERSION,
      '`@types/bun` difere do `.bun-version`. Os tipos descrevem a API de uma versão do runtime: ' +
        'com versões diferentes, o `typecheck` aprova chamada que o binário não tem (ou recusa a ' +
        'que tem). Subir os dois juntos.',
    );
  });
});

describe('BUN-VERSION-SINGLE-SOURCE — o CI instala o Bun da fonte', () => {
  const workflows = workflowFiles();
  const runningBun = workflows.filter((f) => RUNS_BUN.test(readSource(f)));

  it('algum workflow executa o Bun (guarda contra verde por vacuidade)', () => {
    assert.ok(
      runningBun.length > 0,
      'nenhum workflow casa `pnpm test`/`test:integration`/`test-integration.ts`/`bun` — ou os ' +
        'workflows mudaram de forma, ou o padrão `RUNS_BUN` envelheceu, e os casos abaixo ' +
        'passariam sem verificar nada.',
    );
  });

  for (const workflow of runningBun) {
    it(`${workflow} instala o Bun por setup-bun pinado e lê .bun-version`, () => {
      const body = readSource(workflow);
      assert.match(
        body,
        SETUP_BUN_PINNED,
        `${workflow} executa o Bun sem \`oven-sh/setup-bun@<sha de 40 hex>\`. Sem ele o job roda ` +
          'no Bun da imagem do runner (se houver), que muda sem aviso — ou falha com ENOENT.',
      );
      const literal = /^\s*bun-version:\s*(.+)$/m.exec(body);
      assert.ok(
        literal === null,
        `${workflow} fixa \`bun-version: ${String(literal?.[1]).trim()}\` à mão — é a segunda ` +
          'cópia do número. Trocar por `bun-version-file: .bun-version`.',
      );
      assert.match(
        body,
        /^\s*bun-version-file:\s*\.bun-version\s*$/m,
        `${workflow} usa setup-bun sem \`bun-version-file: .bun-version\`.`,
      );
    });
  }
});
