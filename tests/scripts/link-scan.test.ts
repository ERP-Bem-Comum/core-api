/**
 * LINK-SCAN — o classificador de referências do handbook (Fase 0 da spec 041).
 *
 * O que este teste cobre é o CLASSIFICADOR, nunca a contagem do repositório. Contagem cai a cada
 * fase do plano por desenho — pinar o número aqui produziria vermelho a cada avanço, que é o
 * inverso do que um gate deve fazer.
 *
 * O caso que originou metade destas asserções: a primeira varredura do próprio `plan.md` da spec
 * 041 acusou dois links mortos que eram EXEMPLOS de sintaxe, escritos para explicar o defeito.
 * Medido depois: remover código inline elimina exatamente 2 falsos positivos em todo o handbook —
 * o `…` literal do CHANGELOG e o exemplo do plano. Documento que documenta a convenção cita a
 * forma quebrada, e extrator que não distingue uso de menção acusa quem a documenta.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { join, resolve } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  stripCode,
  extractRelativeLinks,
  classifyLink,
  scanHandbook,
  ignoredPaths,
  type LinkRef,
} from '../../scripts/handbook/link-scan.ts';
import { gitFixtureEnv, withoutGitEnv } from '../support/git-fixture.ts';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');

const link = (over: Partial<LinkRef> = {}): LinkRef => ({
  from: 'handbook/architecture/x.md',
  raw: './y.md',
  target: 'handbook/architecture/y.md',
  ...over,
});

/** `tracked` é "está no repositório", NUNCA "existe neste disco" — ver o comentário em ClassifyInput. */
const classify = (
  over: Partial<LinkRef>,
  tracked: boolean,
  opts: {
    ignored?: boolean;
    historicalPrefixes?: readonly string[];
    redirects?: ReadonlyMap<string, string | null>;
  } = {},
): string =>
  classifyLink({
    link: link(over),
    targetTracked: tracked,
    targetIgnored: opts.ignored ?? false,
    mirrorPrefix: 'handbook/reference/',
    historicalPrefixes: opts.historicalPrefixes ?? [],
    redirects: opts.redirects ?? new Map(),
  });

describe('LINK-SCAN — uso × menção', () => {
  it('remove bloco cercado e código inline', () => {
    assert.equal(stripCode('a ```[x](./morto.md)``` b').includes('morto'), false);
    assert.equal(stripCode('a `[x](./morto.md)` b').includes('morto'), false);
    assert.equal(stripCode('a [x](./vivo.md) b').includes('vivo'), true);
  });

  it('link citado como exemplo em crase NÃO é extraído', () => {
    const md = 'Uma citação como `[ADR-0017](./0017-titulo.md)` acopla identidade e caminho.';
    assert.deepEqual(extractRelativeLinks(md), []);
  });

  it('link de verdade é extraído mesmo com o TEXTO em crase', () => {
    // Forma comum no handbook: [`arquivo.md`](./arquivo.md). A crase está no rótulo, não no destino.
    assert.deepEqual(extractRelativeLinks('veja [`a.md`](./a.md)'), ['./a.md']);
  });

  it('ignora destino externo e âncora pura', () => {
    const md = '[a](https://x.dev) [b](mailto:a@b.c) [c](#secao) [d](./real.md)';
    assert.deepEqual(extractRelativeLinks(md), ['./real.md']);
  });

  it('mantém o destino cru, com âncora — quem corta é o resolvedor', () => {
    assert.deepEqual(extractRelativeLinks('[a](./x.md#s3)'), ['./x.md#s3']);
  });

  it('não confunde parêntese de texto com link', () => {
    assert.deepEqual(extractRelativeLinks('texto (parêntese) sem link'), []);
  });
});

describe('LINK-SCAN — classificação', () => {
  it('o que escapa da raiz é espelho de terceiro, exista ou não', () => {
    assert.equal(classify({ target: '../../../en/settings' }, false), 'escapes-repo');
    assert.equal(classify({ target: '../../../en/settings' }, true), 'escapes-repo');
  });

  it('alvo que existe é vivo — inclusive citado por reference/', () => {
    assert.equal(classify({ from: 'handbook/reference/drizzle/x.md' }, true), 'live');
  });

  it('alvo gitignored deliberadamente é local-only, não passivo', () => {
    // O caso real que derrubou o CI: `handbook/guidelines/` (PDFs Bradesco, restrição de
    // redistribuição) existe na máquina de quem tem os arquivos e não existe no runner. Medir
    // por disco fazia o mesmo link ser vivo aqui e morto lá — gate cuja resposta depende da
    // máquina não verifica nada.
    assert.equal(
      classify({ target: 'handbook/guidelines' }, false, { ignored: true }),
      'local-only',
    );
  });

  it('local-only ganha de mirror e de historical — a política vem antes da origem', () => {
    assert.equal(
      classify({ from: 'handbook/reference/x.md', target: 'handbook/guidelines' }, false, {
        ignored: true,
        historicalPrefixes: ['handbook/guidelines'],
      }),
      'local-only',
    );
  });

  it('quebrado dentro de reference/ é mirror, não passivo nosso', () => {
    assert.equal(classify({ from: 'handbook/reference/drizzle/x.md' }, false), 'mirror');
  });

  it('quebrado em material autoral é o passivo', () => {
    assert.equal(classify({}, false), 'unaddressed');
  });

  it('aparato expurgado é declarado histórico, nunca consertado (ADR-0057 §5)', () => {
    assert.equal(
      classify({ target: '.claude/.pipeline/CTR-X/000-request.md' }, false, {
        historicalPrefixes: ['.claude/.pipeline/'],
      }),
      'historical',
    );
  });

  it('redirect com destino vivo endereça o link', () => {
    const redirects = new Map([['handbook/domain/x.md', 'handbook/domain_questions/x.md']]);
    assert.equal(classify({ target: 'handbook/domain/x.md' }, false, { redirects }), 'redirected');
  });

  it('redirect com to: null é lápide, e lápide ENDEREÇA', () => {
    // A Fase 0 deixou este caso como `unaddressed`, "até a Fase 3 decidir". A Fase 3 decidiu: a
    // lápide é a declaração. O link segue quebrado para quem clica, mas alguém decidiu, escreveu
    // por quê e datou — que é tudo o que o gate pode exigir. Proibir que documento morra seria
    // outra política, e não é esta.
    const redirects = new Map<string, string | null>([['handbook/domain/x.md', null]]);
    assert.equal(classify({ target: 'handbook/domain/x.md' }, false, { redirects }), 'tombstoned');
  });

  it('alvo sem entrada alguma segue sendo o passivo', () => {
    const redirects = new Map<string, string | null>([['outro.md', null]]);
    assert.equal(classify({ target: 'handbook/domain/x.md' }, false, { redirects }), 'unaddressed');
  });
});

describe('LINK-SCAN — gitignore de diretório ausente (o caso que derrubou o CI duas vezes)', () => {
  let repo = '';

  // `ignoredPaths` invoca `git check-ignore` herdando o ambiente do processo — e faz certo, porque
  // no uso real roda no pre-commit, sobre o repositório do hook. Aqui o alvo é o fixture, e sem
  // limpar as `GIT_*` a consulta responderia sobre o repositório de verdade.
  const ignored = (paths: readonly string[]) => withoutGitEnv(() => ignoredPaths(repo, paths));

  before(() => {
    repo = mkdtempSync(join(tmpdir(), 'link-scan-ignore-'));
    // `env` sanitizado além do `cwd`: dentro de um `git commit`, `GIT_DIR` vence o `cwd` e este
    // `init` marcaria o repositório REAL como bare. Ver `tests/support/git-fixture.ts`.
    execFileSync('git', ['init', '--quiet'], { cwd: repo, env: gitFixtureEnv() });
    // Padrão de DIRETÓRIO, e o diretório NÃO é criado — é a situação exata do runner de CI, onde
    // `handbook/guidelines/` (PDFs sob restrição de redistribuição) não existe.
    writeFileSync(join(repo, '.gitignore'), 'material-local/\n');
  });

  after(() => {
    rmSync(repo, { recursive: true, force: true });
  });

  it('reconhece como ignorado mesmo com o diretório ausente do disco', () => {
    // Com a consulta feita só na forma sem barra, este caso responde "não ignorado" — e foi assim
    // que o gate passou na máquina de quem escreveu e falhou no CI, duas vezes seguidas.
    assert.ok(
      ignored(['material-local']).has('material-local'),
      'padrão de diretório precisa ser reconhecido mesmo quando o diretório não existe no disco',
    );
  });

  it('caminho que ninguém ignora segue de fora', () => {
    assert.equal(ignored(['outro-diretorio']).has('outro-diretorio'), false);
  });

  it('lista vazia não invoca o git', () => {
    assert.equal(ignored([]).size, 0);
  });
});

describe('LINK-SCAN — a varredura enxerga o handbook', () => {
  it('encontra links vivos em volume (guarda contra verde por vacuidade)', () => {
    const result = scanHandbook(PROJECT_ROOT);
    const live = (result.get('live') ?? []).length;
    assert.ok(
      live > 500,
      `só ${live} links vivos encontrados — o glob quebrou e as asserções acima passariam sobre nada`,
    );
  });
});
