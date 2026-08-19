/**
 * GIT-FIXTURE-ENV — repositório de fixture não obedece ao `GIT_DIR` do hook (#759).
 *
 * O defeito que este gate impede de voltar, medido em 19/08/2026: três testes criavam repositório
 * de fixture passando só `cwd`. O `.githooks/pre-commit` roda a suíte inteira, e o git exporta
 * `GIT_DIR`/`GIT_INDEX_FILE` no ambiente dos hooks — variáveis que VENCEM o `cwd`. Uma tentativa de
 * commit bastava para marcar o repositório real como `bare` (derrubando `git status` no checkout
 * principal e em toda worktree linkada) e gravar a identidade do fixture no `.git/config` de
 * verdade. Corrigido no PR #758; este gate é o mecanismo que faltava.
 *
 * Fonte primária: `githooks(5)` — _"Environment variables, such as GIT_DIR, GIT_WORK_TREE, etc.,
 * are exported (…) If your hook needs to invoke Git commands in a foreign repository (…) it should
 * clear these environment variables"_.
 *
 * ⚠️ O gate NÃO proíbe invocar `git` nos testes: proíbe invocá-lo contra um repositório de FIXTURE
 * sem sanitizar o ambiente. Consultar o próprio repositório (`git ls-files` nos gates estruturais)
 * é legítimo e continua passando — um gate que reprovasse os dois seria desligado na primeira
 * semana, e aí não protegeria nada.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { join } from 'node:path';

import { PROJECT_ROOT, readSource, walkFiles, isCommentLine } from '../support/source-scan.ts';

// As quatro formas de invocar processo com `git` como executável. `git` tem de ser o PRIMEIRO
// argumento: `execFileSync(bin, ['git', …])` seria outra coisa, e um padrão frouxo aqui acusaria
// qualquer string 'git' num array.
const INVOCATION = /\b(execFileSync|spawnSync|execFile|spawn)\(\s*'git'/g;

// Identificadores que significam "a raiz DESTE repositório". Uma invocação assim consulta o
// próprio repositório de propósito — é o caso dos gates que perguntam `git ls-files`.
const REPO_ROOT_IDENTIFIERS = new Set(['PROJECT_ROOT', 'REPO_ROOT']);

type Invocation = Readonly<{
  file: string;
  line: number;
  block: string;
  /** `null` quando a chamada não declara `cwd` — herda o do processo, que é a raiz do repo. */
  cwd: string | null;
}>;

/**
 * O texto da chamada, do `(` de abertura até o `)` que o fecha.
 *
 * Conta parênteses ignorando o que está dentro de string, porque um `)` literal num argumento
 * (numa mensagem de erro, por exemplo) fecharia o bloco cedo e o gate leria metade da chamada —
 * classificando como "sem env" algo que tem env três linhas abaixo.
 */
const callBlock = (source: string, openIndex: number): string => {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openIndex; i < source.length; i += 1) {
    const ch = source[i] ?? '';
    if (quote !== null) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(') depth += 1;
    else if (ch === ')') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex, i + 1);
    }
  }
  return source.slice(openIndex);
};

/** O valor textual de `cwd:` — o identificador ou literal, sem o que vem depois da vírgula. */
const CWD_VALUE = /\bcwd:\s*([^,\n}]+)/;

/**
 * A propriedade `env` no objeto de opções — nas DUAS formas que JavaScript permite: `env: x` e o
 * shorthand `{ cwd, env }`.
 *
 * Exigir só `env:` foi o primeiro erro deste gate, e ele reprovou justamente o arquivo já
 * corrigido: `gate-blocker.test.ts` passa `{ cwd: dir, env }`. Um gate que acusa quem acertou é
 * desligado antes de pegar quem errou.
 *
 * O `[{,]` inicial exige que `env` comece uma propriedade, e é o que impede `process.env` (que
 * vem precedido de ponto) de ser lido como declaração de ambiente sanitizado.
 */
const ENV_PROPERTY = /[{,]\s*env\s*[:,}]/;

const invocationsIn = (file: string): readonly Invocation[] => {
  const source = readSource(file);
  const lines = source.split('\n');
  const out: Invocation[] = [];

  for (const match of source.matchAll(INVOCATION)) {
    const at = match.index;
    const line = source.slice(0, at).split('\n').length;
    // Menção em comentário não é uso. A distinção já custou seis vereditos errados neste
    // repositório, e é a razão de `source-scan` separar `filesUsing` de `filesContaining`.
    if (isCommentLine(lines[line - 1] ?? '')) continue;

    const open = source.indexOf('(', at);
    const block = callBlock(source, open);
    const cwd = CWD_VALUE.exec(block)?.[1]?.trim() ?? null;
    out.push({ file, line, block, cwd });
  }

  return out;
};

/** Chamada contra um repositório que NÃO é este — a que precisa do ambiente sanitizado. */
const isFixture = (call: Invocation): boolean =>
  call.cwd !== null && !REPO_ROOT_IDENTIFIERS.has(call.cwd);

const allInvocations = (): readonly Invocation[] =>
  walkFiles(join(PROJECT_ROOT, 'tests'), { ext: '.ts' }).flatMap(invocationsIn);

describe('GIT-FIXTURE-ENV — todo `git` de fixture sanitiza o ambiente (#759)', () => {
  it('nenhuma invocação contra repositório de fixture herda o ambiente', () => {
    const offenders = allInvocations()
      .filter(isFixture)
      .filter((c) => !ENV_PROPERTY.test(c.block))
      .map((c) => `${c.file}:${String(c.line)} (cwd: ${c.cwd ?? '—'})`);

    assert.deepEqual(
      offenders,
      [],
      'invocação de `git` contra fixture sem `env` sanitizado — `cwd` NÃO isola dentro do ' +
        'pre-commit, porque `GIT_DIR` vence. Passe `env: gitFixtureEnv()` de ' +
        '`tests/support/git-fixture.ts`; se quem invoca o git é código de produção que herda o ' +
        'ambiente do processo, envolva a chamada em `withoutGitEnv(...)`:\n' +
        offenders.join('\n'),
    );
  });

  // O contrapeso, e a razão de o gate ser usável: consultar o PRÓPRIO repositório é legítimo.
  // Sem esta asserção, alguém "endureceria" o gate para exigir `env` em toda invocação, e os
  // gates estruturais que perguntam `git ls-files` passariam a falhar — o caminho mais curto para
  // o gate inteiro ser desligado.
  it('consulta ao próprio repositório continua livre de exigência de env', () => {
    const repoReads = allInvocations().filter((c) => !isFixture(c));

    assert.ok(
      repoReads.length > 0,
      'nenhuma consulta ao próprio repositório foi encontrada: ou a classificação inverteu, ou a ' +
        'varredura parou de enxergar os gates que usam `git ls-files`',
    );
    assert.ok(
      repoReads.some((c) => !ENV_PROPERTY.test(c.block)),
      'toda consulta ao próprio repositório passou a declarar `env` — o gate virou exigência ' +
        'universal e deixou de distinguir fixture de leitura legítima',
    );
  });

  // Guarda contra verde por vacuidade, em duas frentes: a varredura enxerga invocações, e enxerga
  // as DUAS classes. Um regex quebrado zeraria a lista e o gate passaria sobre nada.
  it('a varredura enxerga as duas classes de invocação', () => {
    const all = allInvocations();

    assert.ok(all.length >= 8, `só ${String(all.length)} invocações de git: o padrão quebrou`);
    assert.ok(all.some(isFixture), 'nenhuma invocação classificada como fixture');
    assert.ok(
      all.some((c) => !isFixture(c)),
      'nenhuma invocação classificada como repo',
    );
  });

  // O extrator de bloco é a peça que pode errar em silêncio: se ele parasse no primeiro `)`, uma
  // chamada multi-linha com `env` no fim seria lida como se não o tivesse — e o gate acusaria
  // quem está correto. Este caso fixa o comportamento sobre a forma que existe no repositório.
  it('lê a chamada inteira, inclusive multi-linha e com parêntese dentro de string', () => {
    const source = [
      "execFileSync('git', ['config', 'user.name', 'x (y)'], {",
      '  cwd: fixture,',
      '  env: gitFixtureEnv(),',
      '});',
    ].join('\n');
    const block = callBlock(source, source.indexOf('('));

    assert.ok(ENV_PROPERTY.test(block), 'o bloco terminou antes do `env`');
    assert.ok(block.trimEnd().endsWith(')'), 'o bloco não fechou no parêntese da chamada');
  });

  // As duas formas de declarar a propriedade, e o não-caso. Fixado porque exigir só `env:` foi o
  // primeiro defeito deste gate: ele reprovou `gate-blocker.test.ts`, que já estava correto.
  it('reconhece `env:` e o shorthand `env`, e não confunde com `process.env`', () => {
    assert.ok(ENV_PROPERTY.test('{ cwd: dir, env: gitFixtureEnv() }'), 'forma `env:`');
    assert.ok(ENV_PROPERTY.test('{ cwd: dir, env }'), 'shorthand no fim');
    assert.ok(ENV_PROPERTY.test('{ env, cwd: dir }'), 'shorthand no início');
    assert.equal(ENV_PROPERTY.test('{ cwd: dir, stdio: process.env }'), false, 'process.env');
  });
});

/*
 * O QUE ESTE GATE NÃO COBRE, e por que a prova por execução não está aqui.
 *
 * A varredura acima enxerga invocação DIRETA de `git`. Não enxerga o outro caminho: teste que
 * chama código de produção que invoca git herdando o ambiente do processo — `stagedRemovedMarkdown`
 * e `ignoredPaths` são dois, e ambos estão certos em herdá-lo, porque no uso real rodam dentro do
 * pre-commit. Quem os aponta para um fixture precisa de `withoutGitEnv`, e nenhuma varredura de
 * texto cobra isso com segurança.
 *
 * A prova que cobriria — rodar os arquivos de fixture com `GIT_DIR` redirecionado para um
 * repositório descartável e exigir que ele saia intacto — foi IMPLEMENTADA E MEDIDA em 19/08/2026,
 * e recusada por custo. Três achados, todos reproduzíveis:
 *
 *   1. o subprocesso herda `NODE_TEST_CONTEXT` e o runner do Node **pula todos os arquivos** com
 *      exit 0 — verde por vacuidade perfeito, e a mesma classe de defeito que este gate combate,
 *      uma camada acima. Contornável removendo a variável;
 *   2. com o contorno, a execução real levou **mais de 120 s** e estourou o timeout: a lista
 *      derivada da varredura inclui `gate-blocker.test.ts`, que roda `tsc` e `git commit` em
 *      fixture e trava sob `GIT_DIR` redirecionado;
 *   3. o resultado dos testes filhos é ruidoso por desenho — 11 falhas ao redirecionar a suíte
 *      inteira, todas de casos que legitimamente consultam ESTE repositório.
 *
 * Dois minutos em todo commit, para uma asserção frágil, seria desligado na primeira semana. O que
 * cobre o caminho indireto hoje: `tests/support/git-fixture.test.ts` prova as duas pontas do
 * helper, e a skill `git-local-expert` documenta a regra. Fica registrado como limite conhecido,
 * não como cobertura que existe.
 */
