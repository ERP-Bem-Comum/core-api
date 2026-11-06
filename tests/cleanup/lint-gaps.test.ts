/**
 * LINT-GAPS — o que o ESLint cobrava e o `oxlint` não tem: `class`, casing e ordem de membros.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Por que existe: o `oxlint` cobre 154 das 158 regras que o ESLint aplicava neste repositório. Das
 * quatro restantes, `no-octal` é recusado pelo próprio compilador (`TS1121`); as outras três vivem
 * aqui, reimplementadas sobre a AST ESTree do `oxc-parser` em `tests/support/lint-gaps.ts`:
 *
 * - **`no-class`** — `no-restricted-syntax` sobre `ClassDeclaration`/`ClassExpression`. Invariante
 *   do CLAUDE.md: tipos são `type Readonly<{}>`, comportamento é função.
 * - **`naming-convention`** — o casing que o CLAUDE.md declara enforced. Fora de `tests/`, como no
 *   `eslint.config.js` (lá a regra é `off` para fixtures usarem `c`, `r`, `a`).
 * - **`member-ordering`** — ordem padrão dos membros de `interface` e type literal.
 *
 * Fidelidade: na migração (05/10/2026), a reimplementação acusou exatamente os mesmos 46 nomes que
 * o ESLint em 2033 arquivos (com a regra forçada também nos testes), e os fixtures do autoteste
 * foram conferidos contra o ESLint linha a linha.
 *
 * Parser: até novembro/2026 a AST vinha da API `typescript/unstable/*`, que lê um campo privado do
 * Node (`stdout._handle.fd`) e quebrava sob o Bun antes da primeira asserção. Hoje vem do
 * `oxc-parser`; os fixtures do autoteste passaram sem mudar marcador algum.
 */

import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { findClasses, findMemberOrder, findNaming } from '../support/lint-gaps.ts';
import type { GapFinding } from '../support/lint-gaps.ts';
import { parseTs } from '../support/oxc-ast.ts';
import { PROJECT_ROOT } from '../support/source-scan.ts';

/**
 * Nomes fora do padrão por DECISÃO, cada um com o motivo. Chave por arquivo + nome, não por
 * linha: a exceção sobrevive a edição acima dela e morre se o nome mudar.
 */
const NAMING_EXCEPTIONS: readonly Readonly<{ file: string; name: string; reason: string }>[] = [
  {
    file: 'src/shared/kernel/non-zero-money.ts',
    name: '__nonZeroMoney',
    reason: 'marcador de branded type — o duplo underscore evita colisão com propriedade real',
  },
  {
    file: 'src/shared/primitives/brand.ts',
    name: '__brand',
    reason: 'símbolo do branded type — o duplo underscore evita colisão com propriedade real',
  },
];

/** Diretórios que o `eslint.config.js` ignorava e que o tsconfig ainda inclui. */
const IGNORED_PREFIXES = ['tests/reports/'];

type Located = GapFinding & Readonly<{ file: string }>;

/**
 * `.ts` versionados — pergunta ao git, não ao disco (rule `testing.md`): arquivo não versionado
 * existe só na máquina de quem escreve, e gate cuja resposta depende de onde roda não verifica.
 */
const trackedTs = (): ReadonlySet<string> =>
  new Set(
    execFileSync('git', ['ls-files', 'src', 'tests', 'scripts', 'db'], {
      cwd: PROJECT_ROOT,
      encoding: 'utf8',
    })
      .split('\n')
      .filter((p) => p.endsWith('.ts') && !IGNORED_PREFIXES.some((d) => p.startsWith(d))),
  );

/**
 * Arquivos do programa do TypeScript, relativos à raiz — perguntados ao compilador pela CLI
 * (`--listFilesOnly`), que roda igual sob Node e Bun.
 */
const programFiles = (): ReadonlySet<string> =>
  new Set(
    execFileSync(
      join(PROJECT_ROOT, 'node_modules', '.bin', 'tsc'),
      ['-p', 'tsconfig.json', '--listFilesOnly'],
      { cwd: PROJECT_ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    )
      .split('\n')
      .filter((abs) => abs.startsWith(`${PROJECT_ROOT}/`))
      .map((abs) => abs.slice(PROJECT_ROOT.length + 1)),
  );

/**
 * Duas guardas contra verde por vacuidade, cada uma para um jeito diferente de um arquivo escapar:
 *
 * - **`outsideProgram`** — `.ts` **versionados** que caem fora dos globs de `include` do
 *   `tsconfig.json`. Desde a troca para o oxc, este gate os varre mesmo assim (lê o que o git
 *   lista, não o que o compilador carrega) — mas o `typecheck` não os vê. Era esta guarda, e só
 *   ela, que garantia isso; por isso ela continua aqui.
 * - **`unparsed`** — arquivos com erro de sintaxe. Árvore parcial esconde nó, e nó escondido é
 *   classe ou nome que a regra não vê.
 *
 * A guarda original era `scanned > 1500`, um limiar: dezenas de arquivos poderiam escapar sem
 * derrubar o número. Contagem não é a propriedade — a propriedade é **nenhum arquivo de fora**, e
 * é ela que se afirma aqui (rule `testing.md`).
 */
const scan = (): Readonly<{
  trackedCount: number;
  outsideProgram: readonly string[];
  unparsed: readonly string[];
  findings: readonly Located[];
}> => {
  const tracked = [...trackedTs()].sort();
  const inProgram = programFiles();
  const parsed = tracked.map((file) =>
    parseTs(file, readFileSync(join(PROJECT_ROOT, file), 'utf8')),
  );
  return {
    trackedCount: tracked.length,
    outsideProgram: tracked.filter((p) => !inProgram.has(p)),
    unparsed: parsed
      .filter((pf) => pf.errors.length > 0)
      .map((pf) => `${pf.fileName}: ${pf.errors[0] ?? ''}`),
    findings: parsed.flatMap((pf) => {
      const naming = pf.fileName.startsWith('tests/') ? [] : findNaming(pf);
      return [...findClasses(pf), ...findMemberOrder(pf), ...naming].map((f) => ({
        ...f,
        file: pf.fileName,
      }));
    }),
  };
};

const isException = (f: Located): boolean =>
  f.rule === 'naming-convention' &&
  NAMING_EXCEPTIONS.some((e) => e.file === f.file && e.name === f.name);

const report = (xs: readonly Located[]): string =>
  xs.map((f) => `${f.file}:${String(f.line)}  ${f.name} — ${f.detail}`).join('\n');

describe('LINT-GAPS — class, casing e ordem de membros', () => {
  const { trackedCount, outsideProgram, unparsed, findings } = scan();

  it('nenhuma classe no repositório', () => {
    const offenders = findings.filter((f) => f.rule === 'no-class');
    assert.deepEqual(offenders, [], `Classe encontrada:\n${report(offenders)}`);
  });

  it('nomes seguem a convenção (fora de tests/)', () => {
    const offenders = findings.filter((f) => f.rule === 'naming-convention' && !isException(f));
    assert.deepEqual(offenders, [], `Nome fora da convenção:\n${report(offenders)}`);
  });

  it('membros de interface e type literal na ordem padrão', () => {
    const offenders = findings.filter((f) => f.rule === 'member-ordering');
    assert.deepEqual(offenders, [], `Membro fora de ordem:\n${report(offenders)}`);
  });

  it('toda exceção de nome ainda é necessária (allowlist não apodrece)', () => {
    const stale = NAMING_EXCEPTIONS.filter(
      (e) => !findings.some((f) => f.file === e.file && f.name === e.name),
    );
    assert.deepEqual(stale, [], 'Exceção que não corresponde a nenhum achado — remover da lista');
  });

  it('o git devolve fontes versionadas (guarda contra verde por lista vazia)', () => {
    assert.ok(
      trackedCount > 0,
      '`git ls-files` não devolveu `.ts` algum — sem isso, os casos abaixo comparam conjuntos ' +
        'vazios e passam sem verificar nada.',
    );
  });

  it('todo `.ts` versionado está no programa do TypeScript (o `typecheck` o vê)', () => {
    assert.deepEqual(
      outsideProgram,
      [],
      `${String(outsideProgram.length)} de ${String(trackedCount)} arquivo(s) versionado(s) ` +
        `ficaram fora do programa do TypeScript:\n${outsideProgram.join('\n')}\n\n` +
        'O `typecheck` não os verifica. Ou o arquivo entra num glob de `include` do ' +
        'tsconfig.json, ou entra em IGNORED_PREFIXES com o motivo.',
    );
  });

  it('todo `.ts` versionado é analisado sem erro de sintaxe (árvore inteira)', () => {
    assert.deepEqual(unparsed, [], `Arquivo com árvore parcial:\n${unparsed.join('\n')}`);
  });

  for (const dependency of ['typescript', 'oxc-parser']) {
    it(`o \`${dependency}\` está em versão EXATA`, () => {
      // `oxc-parser`: a forma da árvore ESTree é a superfície de que este gate depende — uma faixa
      // deixa a resolução trocá-la sem decisão. `typescript`: ADR-0072 D4, ainda vigente. O motivo
      // que o D4 escreveu (a API `unstable/` destes gates) deixou de valer com a troca para o oxc;
      // a divergência é do ADR a registrar, não deste teste a resolver.
      const manifest = JSON.parse(readFileSync(join(PROJECT_ROOT, 'package.json'), 'utf8')) as {
        devDependencies?: Record<string, string>;
      };
      const spec = manifest.devDependencies?.[dependency] ?? '(ausente)';
      assert.match(
        spec,
        /^\d+\.\d+\.\d+$/,
        `${dependency} declarado como "${spec}" — fixar a versão exata`,
      );
    });
  }
});
