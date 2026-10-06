/**
 * LINT-GAPS — autoteste das três regras reimplementadas sobre a AST do TypeScript 7.
 *
 * Roda os fixtures de `lint-gaps.fixtures.ts` num projeto TEMPORÁRIO fora do repositório e exige
 * que cada regra acuse exatamente as linhas marcadas com `@expect` — nem mais, nem menos. Os
 * marcadores foram conferidos contra o ESLint enquanto ele era o gate; este teste é o que mantém
 * a reimplementação fiel depois que ele sair.
 *
 * Sem este teste, o gate de `tests/cleanup/lint-gaps.test.ts` pode ficar verde por regra que parou
 * de acusar — o mesmo modo de falha que fez a migração de setembro perder o `no-restricted-imports`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { GAP_FIXTURES, expectedLines } from './lint-gaps.fixtures.ts';
import { findClasses, findMemberOrder, findNaming } from './lint-gaps.ts';
import type { GapFinding } from './lint-gaps.ts';
import { withProject } from './ts-ast.ts';

const RULES = ['no-class', 'member-ordering', 'naming-convention'] as const;

/** Achados por arquivo de fixture, calculados uma vez — a API do compilador custa abrir. */
const scanFixtures = (): ReadonlyMap<string, readonly GapFinding[]> => {
  const dir = mkdtempSync(join(tmpdir(), 'lint-gaps-'));
  try {
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { strict: true, target: 'ES2024', module: 'NodeNext', types: [] },
        include: ['*.ts'],
      }),
    );
    for (const f of GAP_FIXTURES) writeFileSync(join(dir, f.file), `${f.code}\n`);
    return withProject(
      join(dir, 'tsconfig.json'),
      (abs) => abs.startsWith(dir),
      (files) =>
        new Map(
          files.map((sf) => [
            basename(sf.fileName),
            [...findClasses(sf), ...findMemberOrder(sf), ...findNaming(sf)],
          ]),
        ),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('LINT-GAPS — as regras acusam exatamente o que o ESLint acusava', () => {
  const found = scanFixtures();

  it('todo fixture foi carregado pela API do compilador', () => {
    assert.deepEqual([...found.keys()].sort(), GAP_FIXTURES.map((f) => f.file).sort());
  });

  for (const fixture of GAP_FIXTURES) {
    for (const rule of RULES) {
      it(`${fixture.file} · ${rule}`, () => {
        const lines = (found.get(fixture.file) ?? [])
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
