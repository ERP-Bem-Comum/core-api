/**
 * LINT-GAPS — o que o ESLint cobrava e o `oxlint` não tem: `class`, casing e ordem de membros.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Por que existe: o `oxlint` cobre 154 das 158 regras que o ESLint aplicava neste repositório. Das
 * quatro restantes, `no-octal` é recusado pelo próprio compilador (`TS1121`); as outras três vivem
 * aqui, reimplementadas sobre a AST do TypeScript 7 em `tests/support/lint-gaps.ts`:
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
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { findClasses, findMemberOrder, findNaming } from '../support/lint-gaps.ts';
import type { GapFinding } from '../support/lint-gaps.ts';
import { PROJECT_ROOT } from '../support/source-scan.ts';
import { withProject } from '../support/ts-ast.ts';

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

const scan = (): Readonly<{ scanned: number; findings: readonly Located[] }> => {
  const tracked = trackedTs();
  const rel = (abs: string): string => abs.slice(PROJECT_ROOT.length + 1);
  return withProject(
    join(PROJECT_ROOT, 'tsconfig.json'),
    (abs) => tracked.has(rel(abs)),
    (files) => ({
      scanned: files.length,
      findings: files.flatMap((sf) => {
        const file = rel(sf.fileName);
        const naming = file.startsWith('tests/') ? [] : findNaming(sf);
        return [...findClasses(sf), ...findMemberOrder(sf), ...naming].map((f) => ({ ...f, file }));
      }),
    }),
  );
};

const isException = (f: Located): boolean =>
  f.rule === 'naming-convention' &&
  NAMING_EXCEPTIONS.some((e) => e.file === f.file && e.name === f.name);

const report = (xs: readonly Located[]): string =>
  xs.map((f) => `${f.file}:${String(f.line)}  ${f.name} — ${f.detail}`).join('\n');

describe('LINT-GAPS — class, casing e ordem de membros', () => {
  const { scanned, findings } = scan();

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

  it('a varredura enxerga o repositório (guarda contra verde por vacuidade)', () => {
    assert.ok(scanned > 1500, `esperado 1500+ arquivos, a API devolveu ${String(scanned)}`);
  });
});
