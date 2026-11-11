import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { formatFinding, scanPaths, scopeOf } from '../support/comment-scan.ts';
import type { CommentRule, LocatedCommentFinding } from '../support/comment-scan.ts';
import { PROJECT_ROOT } from '../support/source-scan.ts';

const SANITIZED_ROOTS: readonly string[] = [
  'tests/support/comment-scan.ts',
  'tests/cleanup/comments.test.ts',
  'scripts/ci/check-comments.ts',
  'src/shared/primitives/',
  'src/shared/kernel/',
  'tests/shared/result.test.ts',
  'tests/shared/brand.test.ts',
  'tests/shared/exhaustive.test.ts',
  'tests/shared/immutable.test.ts',
  'tests/shared/kernel/cnpj.test.ts',
  'tests/shared/kernel/cpf.test.ts',
  'tests/shared/kernel/money.test.ts',
  'tests/shared/kernel/non-zero-money.test.ts',
  'tests/shared/kernel/period.test.ts',
  'tests/shared/kernel/plain-date.test.ts',
  'tests/shared/kernel/user-ref.test.ts',
  'tests/shared/kernel/index.test.ts',
  'src/jobs/contracts/sweeper/clock-sao-paulo.ts',
  'tests/jobs/contracts/sweeper/clock-sao-paulo.test.ts',
  'tests/cleanup/brand-cast-ownership.test.ts',
];

type Fixture = Readonly<{
  file: string;
  code: string;
  expected: readonly (readonly [CommentRule, number])[];
}>;

const FIXTURES: readonly Fixture[] = [
  {
    file: 'src/line-comment.ts',
    code: `export const a = 1;\n// nota solta\nexport const b = 2; // nota no fim\n`,
    expected: [
      ['line-comment', 2],
      ['line-comment', 3],
    ],
  },
  {
    file: 'src/block-comment.ts',
    code: [
      '/* bloco */',
      'export const a = 1;',
      'export const b = /* dentro */ 2;',
      '/**/',
      'export const c = 3;',
      'export const t = `/* texto */ ${c /* no código do template */} /* texto */`;',
      '',
    ].join('\n'),
    expected: [
      ['block-comment', 1],
      ['block-comment', 3],
      ['block-comment', 4],
      ['block-comment', 6],
    ],
  },
  {
    file: 'src/loose-header.ts',
    code: `/** Cabeçalho de arquivo. */\nimport { x } from './x.ts';\n\nexport const a = x;\n`,
    expected: [['loose-tsdoc', 1]],
  },
  {
    file: 'src/loose-blank-line.ts',
    code: `/** Valor. */\n\nexport const a = 1;\n`,
    expected: [['loose-tsdoc', 1]],
  },
  {
    file: 'src/loose-in-body.ts',
    code: `export const f = (): number => {\n  /** Interno. */\n  const b = 1;\n  return b;\n};\n`,
    expected: [['loose-tsdoc', 2]],
  },
  {
    file: 'src/loose-statement.ts',
    code: `/** Chamada. */\nconsole.log(1);\n`,
    expected: [['loose-tsdoc', 1]],
  },
  {
    file: 'src/loose-end-of-line.ts',
    code: `export const a = 1; /** Fim. */ export const b = 2;\n`,
    expected: [['loose-tsdoc', 1]],
  },
  {
    file: 'src/loose-end-of-file.ts',
    code: `export const a = 1;\n/** Nada depois. */\n`,
    expected: [['loose-tsdoc', 2]],
  },
  {
    file: 'src/loose-private-object.ts',
    code: `const o = {\n  /** Campo. */\n  a: 1,\n};\nexport const b = o;\n`,
    expected: [['loose-tsdoc', 2]],
  },
  {
    file: 'src/loose-between-comments.ts',
    code: `/** Valor. */\n// nota\nexport const a = 1;\n`,
    expected: [
      ['loose-tsdoc', 1],
      ['line-comment', 2],
    ],
  },
  {
    file: 'src/tag-not-allowed.ts',
    code: `/**\n * Valor.\n * @remarks Porque sim.\n * @todo Depois.\n */\nexport const a = 1;\n`,
    expected: [
      ['tag-not-allowed', 3],
      ['tag-not-allowed', 4],
    ],
  },
  {
    file: 'src/example-repeated.ts',
    code: `/**\n * Valor.\n * @example a\n * @example b\n */\nexport const a = 1;\n`,
    expected: [['example-repeated', 4]],
  },
  {
    file: 'src/param-unknown.ts',
    code: `/**\n * Dobro.\n * @param x - Valor.\n * @param y - Fantasma.\n */\nexport const double = (x: number): number => x * 2;\n`,
    expected: [['param-unknown', 4]],
  },
  {
    file: 'src/param-missing.ts',
    code: `/**\n * Soma.\n * @param a - Primeira.\n */\nexport function sum(a: number, b: number): number {\n  return a + b;\n}\n`,
    expected: [['param-missing', 1]],
  },
  {
    file: 'src/param-on-non-function.ts',
    code: `/**\n * Valor.\n * @param x - Não há função.\n */\nexport const a = 1;\n`,
    expected: [['param-unknown', 3]],
  },
  {
    file: 'src/type-param-unknown.ts',
    code: `/**\n * Caixa.\n * @typeParam T - Conteúdo.\n * @typeParam U - Fantasma.\n */\nexport type Box<T> = Readonly<{ value: T }>;\n`,
    expected: [['type-param-unknown', 4]],
  },
  {
    file: 'src/type-param-missing.ts',
    code: `/**\n * Par.\n * @typeParam A - Primeiro.\n */\nexport type Pair<A, B> = readonly [A, B];\n`,
    expected: [['type-param-missing', 1]],
  },
  {
    file: 'src/directive-not-allowed.ts',
    code: [
      '// eslint-disable-next-line no-console',
      'console.log(1);',
      '// @ts-expect-error',
      'export const a: number = "x";',
      '// @ts-ignore',
      'export const b: number = "x";',
      '// oxlint-disable-next-line typescript/no-explicit-any -- motivo em prosa',
      'export const c: any = 1;',
      '/* eslint-disable */',
      '',
    ].join('\n'),
    expected: [
      ['directive-not-allowed', 1],
      ['directive-not-allowed', 3],
      ['directive-not-allowed', 5],
      ['directive-not-allowed', 7],
      ['directive-not-allowed', 9],
    ],
  },
  {
    file: 'src/clean.ts',
    code: [
      '#!/usr/bin/env node',
      '/// <reference types="node" />',
      "export const s = 'a // b /* c */';",
      'export const t = `x // y ${s === "" ? 1 : 2} z /* w */ ${`${"//"}`}`;',
      'export const r = /\\/\\/ não é comentário \\/\\*/g;',
      'export const d = 4 / 2 / 1;',
      'export type Tpl<T extends string> = `${T}// literal`;',
      '/**',
      ' * Aplica `f` a cada item.',
      ' * @typeParam T - Tipo do item.',
      ' * @param items - Os itens.',
      ' * @param options - Opções.',
      ' * @param options.limit - Máximo de itens.',
      ' * @returns Os itens transformados.',
      ' * @throws Nunca.',
      ' * @example',
      ' * ```ts',
      ' * // comentário dentro do exemplo',
      ' * @decorator',
      ' * ```',
      ' * @see {@link d}',
      ' * @deprecated Use outra.',
      ' */',
      'export function map<T>(items: readonly T[], options: { limit: number }): readonly T[] {',
      '  return items.slice(0, options.limit);',
      '}',
      '/**',
      ' * Lê o par.',
      ' * @param pair - O par desestruturado.',
      ' */',
      'export const first = ([a]: readonly [number, number]): number => a;',
      '/** Configuração. */',
      'export interface Config {',
      '  /**',
      '   * Limite.',
      '   * @defaultValue 10',
      '   */',
      '  readonly limit: number;',
      '  /**',
      '   * Executa.',
      '   * @param n - Quantidade.',
      '   */',
      '  readonly run: (n: number) => void;',
      '}',
      '/** API exportada. */',
      'export const api = {',
      '  /** Versão. */',
      '  version: 1,',
      '};',
      '/** Qualquer coisa. */',
      '// oxlint-disable-next-line typescript/no-explicit-any',
      'export type AnyFn = (...args: any[]) => unknown;',
      '// eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access',
      'export const n = (globalThis as any).x!.y;',
      '',
    ].join('\n'),
    expected: [],
  },
  {
    file: 'tests/expect-error.ts',
    code: `// @ts-expect-error\nexport const a: number = 'x';\n`,
    expected: [],
  },
];

const tracked = (): readonly string[] =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', '*.ts'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((p) => p.length > 0);

const isUnderRoot = (file: string, root: string): boolean =>
  root.endsWith('.ts') ? file === root : file.startsWith(root.endsWith('/') ? root : `${root}/`);

const scanFixtures = (): Readonly<{
  findings: readonly LocatedCommentFinding[];
  unparsed: readonly string[];
}> => {
  const dir = mkdtempSync(join(tmpdir(), 'comment-scan-'));
  try {
    for (const f of FIXTURES) {
      mkdirSync(dirname(join(dir, f.file)), { recursive: true });
      writeFileSync(join(dir, f.file), f.code);
    }
    return scanPaths(
      dir,
      FIXTURES.map((f) => f.file),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const runCli = (code: string): Readonly<{ status: number | null; stdout: string }> => {
  const dir = mkdtempSync(join(tmpdir(), 'check-comments-'));
  try {
    const file = join(dir, 'fixture.ts');
    writeFileSync(file, code);
    const result = spawnSync(
      process.execPath,
      ['--enable-source-maps', join(PROJECT_ROOT, 'scripts/ci/check-comments.ts'), file],
      { encoding: 'utf8' },
    );
    return { status: result.status, stdout: result.stdout };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

describe('COMMENTS — só TSDoc colado em declaração, nos arquivos já saneados', () => {
  const files = tracked().filter((f) => SANITIZED_ROOTS.some((root) => isUnderRoot(f, root)));
  const { findings, unparsed } = scanPaths(PROJECT_ROOT, files);

  it('toda entrada de SANITIZED_ROOTS casa com pelo menos um .ts versionado', () => {
    const empty = SANITIZED_ROOTS.filter((root) => !files.some((f) => isUnderRoot(f, root)));
    assert.deepEqual(empty, [], `Entrada sem arquivo .ts versionado:\n${empty.join('\n')}`);
  });

  it('todo arquivo sob SANITIZED_ROOTS é entregue pelo compilador', () => {
    assert.deepEqual(
      unparsed,
      [],
      `Arquivo que o compilador não entregou:\n${unparsed.join('\n')}`,
    );
  });

  it('nenhum arquivo sob SANITIZED_ROOTS tem violação da regra de comentários', () => {
    assert.deepEqual(
      findings.map(formatFinding),
      [],
      `Violação da regra de comentários (.claude/rules/comments.md):\n${findings.map(formatFinding).join('\n')}`,
    );
  });
});

describe('scanComments devolve, na ordem do arquivo, a regra e a linha de cada violação', () => {
  const { findings, unparsed } = scanFixtures();

  it('scanPaths entrega todos os fixtures ao scanner', () => {
    assert.deepEqual(unparsed, []);
  });

  for (const fixture of FIXTURES) {
    it(`${fixture.file}: ${fixture.expected.length === 0 ? 'devolve lista vazia' : fixture.expected.map(([rule, line]) => `${rule}@${String(line)}`).join(', ')}`, () => {
      const got = findings
        .filter((f) => f.file === fixture.file)
        .map((f): readonly [CommentRule, number] => [f.rule, f.line]);
      assert.deepEqual(got, fixture.expected, findings.map(formatFinding).join('\n'));
    });
  }

  it('todo CommentRule tem ao menos um fixture que o acusa', () => {
    const rules: readonly CommentRule[] = [
      'line-comment',
      'block-comment',
      'loose-tsdoc',
      'tag-not-allowed',
      'example-repeated',
      'param-unknown',
      'param-missing',
      'type-param-unknown',
      'type-param-missing',
      'directive-not-allowed',
    ];
    const covered = new Set(FIXTURES.flatMap((f) => f.expected.map(([rule]) => rule)));
    assert.deepEqual(
      rules.filter((r) => !covered.has(r)),
      [],
    );
  });

  it('// @ts-expect-error é aceito em tests/ e acusado fora de tests/', () => {
    const inTests = findings.filter((f) => f.file === 'tests/expect-error.ts');
    const inSource = findings.filter(
      (f) => f.file === 'src/directive-not-allowed.ts' && f.line === 3,
    );
    assert.deepEqual(inTests, []);
    assert.equal(inSource.length, 1);
  });

  it('// e /* */ dentro de string, template literal e regex não são acusados', () => {
    assert.deepEqual(
      findings.filter((f) => f.file === 'src/clean.ts'),
      [],
    );
  });
});

describe('scanPaths, scopeOf e formatFinding', () => {
  it('scanPaths devolve em unparsed o caminho que o compilador não entregou', () => {
    const { findings, unparsed } = scanPaths(PROJECT_ROOT, ['tests/support/nao-existe.ts']);
    assert.deepEqual(unparsed, ['tests/support/nao-existe.ts']);
    assert.deepEqual(findings, []);
  });

  it("scopeOf devolve 'tests' para caminho sob tests/ e 'source' para qualquer outro", () => {
    assert.equal(scopeOf('tests/cleanup/x.ts'), 'tests');
    assert.equal(scopeOf('src/tests/x.ts'), 'source');
    assert.equal(scopeOf('scripts/ci/x.ts'), 'source');
  });

  it('formatFinding produz arquivo:linha: [regra] mensagem', () => {
    assert.equal(
      formatFinding({ file: 'src/a.ts', line: 7, rule: 'line-comment', detail: 'msg' }),
      'src/a.ts:7: [line-comment] msg',
    );
  });
});

describe('check-comments (CLI)', () => {
  it('sai com 1 e imprime arquivo:linha quando há violação', () => {
    const { status, stdout } = runCli('export const a = 1; // nota\n');
    assert.equal(status, 1);
    assert.match(stdout, /fixture\.ts:1: \[line-comment\]/);
  });

  it('sai com 0 e não imprime nada quando o arquivo está limpo', () => {
    const { status, stdout } = runCli('/** Valor. */\nexport const a = 1;\n');
    assert.equal(status, 0);
    assert.equal(stdout, '');
  });
});
