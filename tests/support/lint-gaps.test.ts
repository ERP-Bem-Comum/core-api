/**
 * LINT-GAPS — autoteste das três regras reimplementadas sobre a AST ESTree do `oxc-parser`.
 *
 * Analisa os fixtures de `lint-gaps.fixtures.ts` e exige que cada regra acuse exatamente as linhas
 * marcadas com `@expect` — nem mais, nem menos. Os marcadores foram conferidos contra o ESLint
 * enquanto ele era o gate; este teste é o que mantém a reimplementação fiel depois que ele saiu —
 * e foi ele que provou a troca da AST do compilador TS 7 pela do oxc sem mudar marcador algum.
 *
 * Sem este teste, o gate de `tests/cleanup/lint-gaps.test.ts` pode ficar verde por regra que parou
 * de acusar — o mesmo modo de falha que fez a migração de setembro perder o `no-restricted-imports`.
 */

import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';

import { GAP_FIXTURES, expectedLines } from './lint-gaps.fixtures.ts';
import { findClasses, findMemberOrder, findNaming } from './lint-gaps.ts';
import type { GapFinding } from './lint-gaps.ts';
import { parseTs } from './oxc-ast.ts';

const RULES = ['no-class', 'member-ordering', 'naming-convention'] as const;

/** Achados e erros de sintaxe por arquivo de fixture. */
const scanFixtures = (): ReadonlyMap<
  string,
  Readonly<{ errors: readonly string[]; findings: readonly GapFinding[] }>
> =>
  new Map(
    GAP_FIXTURES.map((f) => {
      const parsed = parseTs(f.file, `${f.code}\n`);
      return [
        f.file,
        {
          errors: parsed.errors,
          findings: [...findClasses(parsed), ...findMemberOrder(parsed), ...findNaming(parsed)],
        },
      ];
    }),
  );

describe('LINT-GAPS — as regras acusam exatamente o que o ESLint acusava', () => {
  const found = scanFixtures();

  it('todo fixture é TypeScript válido (árvore parcial esconderia achados)', () => {
    const broken = [...found].filter(([, r]) => r.errors.length > 0);
    assert.deepEqual(broken, []);
  });

  for (const fixture of GAP_FIXTURES) {
    for (const rule of RULES) {
      it(`${fixture.file} · ${rule}`, () => {
        const lines = (found.get(fixture.file)?.findings ?? [])
          .filter((f) => f.rule === rule)
          .map((f) => f.line);
        assert.deepEqual(
          [...new Set(lines)].sort((a, b) => a - b),
          [...expectedLines(fixture.code, rule)],
        );
      });
    }
  }

  it('há caso positivo para cada regra (guarda contra fixture que não testa nada)', () => {
    for (const rule of RULES) {
      const total = GAP_FIXTURES.reduce((n, f) => n + expectedLines(f.code, rule).length, 0);
      assert.ok(total >= 2, `${rule}: só ${String(total)} linha(s) marcada(s)`);
    }
  });
});
