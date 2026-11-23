import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { PROJECT_ROOT, walkFiles } from '../support/source-scan.ts';
import { SyntaxKind, lineOf, withProject } from '../support/ts-ast.ts';
import type { Node, SourceFile } from '../support/ts-ast.ts';

/** Visão estrutural mínima dos nós que o detector lê. */
type NodeView = Node &
  Readonly<{
    text?: string;
    name?: Node;
    propertyName?: Node;
    type?: Node;
    typeName?: Node;
    typeArguments?: readonly Node[];
    types?: readonly Node[];
    literal?: Node;
    left?: Node;
    right?: Node;
    moduleSpecifier?: Node;
    importClause?: Node;
    namedBindings?: Node;
    elements?: readonly Node[];
  }>;

/** Caminho do módulo do VO, relativo à raiz do repositório. */
const PLAIN_DATE_MODULE = 'src/shared/kernel/plain-date.ts';

/** Especificador de import que aponta para o módulo do VO, por alias `#src` ou caminho relativo. */
const PLAIN_DATE_SPECIFIER = /(^|\/)plain-date(\.ts)?$/;

const view = (node: Node): NodeView => node as NodeView;

const textOf = (node: Node | undefined): string =>
  node === undefined ? '' : (view(node).text ?? '');

const walk = (node: Node, visit: (n: Node) => void): void => {
  visit(node);
  node.forEachChild((child) => {
    walk(child, visit);
    return undefined;
  });
};

/** Nomes locais que denotam o tipo `PlainDate` e nomes locais do namespace do módulo. */
type PlainDateNames = Readonly<{ types: ReadonlySet<string>; namespaces: ReadonlySet<string> }>;

const collectImports = (sf: SourceFile, types: Set<string>, namespaces: Set<string>): void => {
  walk(sf, (n) => {
    if (n.kind === SyntaxKind.ImportSpecifier) {
      const v = view(n);
      if (textOf(v.propertyName ?? v.name) === 'PlainDate') types.add(textOf(v.name));
      return;
    }
    if (n.kind !== SyntaxKind.ImportDeclaration) return;
    const v = view(n);
    if (!PLAIN_DATE_SPECIFIER.test(textOf(v.moduleSpecifier))) return;
    const bindings = v.importClause === undefined ? undefined : view(v.importClause).namedBindings;
    if (bindings?.kind === SyntaxKind.NamespaceImport) namespaces.add(textOf(view(bindings).name));
  });
};

const unwrapParens = (node: Node): Node => {
  let cur = node;
  while (cur.kind === SyntaxKind.ParenthesizedType) {
    const inner = view(cur).type;
    if (inner === undefined) break;
    cur = inner;
  }
  return cur;
};

const hasPlainDateBrandArgument = (ref: NodeView): boolean =>
  (ref.typeArguments ?? []).some((arg) => {
    const a = unwrapParens(arg);
    const literal = view(a).literal;
    return (
      a.kind === SyntaxKind.LiteralType &&
      literal?.kind === SyntaxKind.StringLiteral &&
      textOf(literal) === 'PlainDate'
    );
  });

const denotesPlainDate = (type: Node, names: PlainDateNames): boolean => {
  const t = unwrapParens(type);
  const v = view(t);
  if (t.kind === SyntaxKind.UnionType || t.kind === SyntaxKind.IntersectionType) {
    return (v.types ?? []).some((member) => denotesPlainDate(member, names));
  }
  if (t.kind !== SyntaxKind.TypeReference || v.typeName === undefined) return false;
  if (hasPlainDateBrandArgument(v)) return true;
  const typeName = view(v.typeName);
  if (v.typeName.kind === SyntaxKind.Identifier) return names.types.has(textOf(v.typeName));
  return (
    v.typeName.kind === SyntaxKind.QualifiedName &&
    textOf(typeName.right) === 'PlainDate' &&
    typeName.left?.kind === SyntaxKind.Identifier &&
    names.namespaces.has(textOf(typeName.left))
  );
};

const collectAliases = (sf: SourceFile, types: Set<string>, namespaces: Set<string>): void => {
  const aliases: NodeView[] = [];
  walk(sf, (n) => {
    if (n.kind === SyntaxKind.TypeAliasDeclaration) aliases.push(view(n));
  });
  let grew = true;
  while (grew) {
    const found = aliases.filter(
      (a) =>
        !types.has(textOf(a.name)) &&
        a.type !== undefined &&
        denotesPlainDate(a.type, { types, namespaces }),
    );
    for (const a of found) types.add(textOf(a.name));
    grew = found.length > 0;
  }
};

const plainDateNames = (sf: SourceFile): PlainDateNames => {
  const types = new Set<string>(['PlainDate']);
  const namespaces = new Set<string>();
  collectImports(sf, types, namespaces);
  collectAliases(sf, types, namespaces);
  return { types, namespaces };
};

/**
 * Linhas do arquivo em que uma asserção de tipo (`expr as T` ou `<T>expr`) tem como alvo o tipo
 * `PlainDate`: pelo nome `PlainDate`, por alias de import ou de `type`, por `Namespace.PlainDate` do
 * módulo do VO, por `Brand<…, 'PlainDate'>` ou por união e interseção que contenha um desses.
 *
 * @param sf - Arquivo a varrer.
 * @returns As linhas, em ordem, uma por asserção.
 */
const findPlainDateCasts = (sf: SourceFile): readonly number[] => {
  const names = plainDateNames(sf);
  const lines: number[] = [];
  walk(sf, (n) => {
    if (n.kind !== SyntaxKind.AsExpression && n.kind !== SyntaxKind.TypeAssertionExpression) return;
    const target = view(n).type;
    if (target !== undefined && denotesPlainDate(target, names)) lines.push(lineOf(sf, n));
  });
  return lines;
};

/** Um arquivo de fixture e quantas asserções para `PlainDate` o detector deve achar nele. */
type CastFixture = Readonly<{ file: string; code: string; casts: number }>;

const ABS = "'#src/shared/kernel/plain-date.ts'";
const REL = "'../../shared/kernel/plain-date.ts'";

/** Casos adversos que o detector deve acusar e vizinhos válidos que ele deve deixar passar. */
const CAST_FIXTURES: readonly CastFixture[] = [
  {
    file: 'alias-import-type.ts',
    code: `import type { PlainDate as PlainDateType } from ${ABS};\nexport const f = (raw: object) => raw as PlainDateType;`,
    casts: 1,
  },
  {
    file: 'alias-inline-type.ts',
    code: `import { type PlainDate as PD } from ${REL};\nexport const f = (raw: object) => raw as PD;`,
    casts: 1,
  },
  {
    file: 'double-cast-unknown.ts',
    code: `import type { PlainDate as PlainDateType } from ${ABS};\nexport const f = (year: number, month: number, day: number) => ({ year, month, day }) as unknown as PlainDateType;`,
    casts: 1,
  },
  {
    file: 'angle-bracket.ts',
    code: `import type { PlainDate } from ${ABS};\nexport const f = (raw: object) => <PlainDate>raw;`,
    casts: 1,
  },
  {
    file: 'namespace-alias.ts',
    code: `import * as PDNS from ${REL};\nexport const f = (raw: object) => raw as PDNS.PlainDate;`,
    casts: 1,
  },
  {
    file: 'namespace-plain-date.ts',
    code: `import * as PlainDate from ${ABS};\nexport const f = (raw: object) => raw as PlainDate.PlainDate;`,
    casts: 1,
  },
  {
    file: 'brand-literal.ts',
    code: `import type { Brand } from '#src/shared/primitives/brand.ts';\nexport const f = (raw: { year: number }) => raw as Brand<{ year: number }, 'PlainDate'>;`,
    casts: 1,
  },
  {
    file: 'local-type-alias.ts',
    code: `import type { PlainDate as PlainDateType } from ${ABS};\ntype Day = PlainDateType;\ntype Today = Day;\nexport const f = (raw: object) => raw as Today;`,
    casts: 1,
  },
  {
    file: 'parenthesized-and-intersection.ts',
    code: `import type { PlainDate as PlainDateType } from ${ABS};\nexport const f = (raw: object) => raw as (PlainDateType);\nexport const g = (raw: object) => raw as PlainDateType & { extra: 1 };`,
    casts: 2,
  },
  {
    file: 'immutable-from-parts.ts',
    code: `import { immutable } from '#src/shared/primitives/immutable.ts';\nimport type { PlainDate as PlainDateType } from ${ABS};\nexport const fromParts = (year: number, month: number, day: number) => immutable({ year, month, day }) as PlainDateType;`,
    casts: 1,
  },
  {
    file: 'valid-namespace-annotation.ts',
    code: `import * as PlainDate from ${ABS};\nexport const f = (at: Date): PlainDate.PlainDate => PlainDate.fromDate(at);`,
    casts: 0,
  },
  {
    file: 'valid-alias-annotation.ts',
    code: `import * as PlainDate from ${ABS};\nimport type { PlainDate as PlainDateType } from ${ABS};\nexport const f = (at: Date): PlainDateType => PlainDate.fromDate(at);\nexport const g = (raw: unknown) => raw as string;`,
    casts: 0,
  },
  {
    file: 'valid-other-brand.ts',
    code: `import type { Brand } from '#src/shared/primitives/brand.ts';\nexport const f = (raw: number) => raw as Brand<number, 'Money'>;`,
    casts: 0,
  },
  {
    file: 'valid-similar-name.ts',
    code: `type PlainDateLike = { year: number };\nexport const f = (raw: object) => raw as PlainDateLike;`,
    casts: 0,
  },
  {
    file: 'valid-other-namespace.ts',
    code: `import * as Other from '#src/shared/kernel/period.ts';\nexport const f = (raw: object) => raw as Other.PlainDate;`,
    casts: 0,
  },
  {
    file: 'valid-mention-only.ts',
    code: `export const s = 'raw as PlainDate';\nexport const t = \`raw as PlainDateType\`;`,
    casts: 0,
  },
];

const scanFixtures = (): ReadonlyMap<string, number> => {
  const dir = mkdtempSync(join(tmpdir(), 'plain-date-cast-'));
  try {
    writeFileSync(
      join(dir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: { strict: true, target: 'ES2024', module: 'NodeNext', types: [] },
        include: ['*.ts'],
      }),
    );
    for (const f of CAST_FIXTURES) writeFileSync(join(dir, f.file), `${f.code}\n`);
    return withProject(
      join(dir, 'tsconfig.json'),
      (abs) => abs.startsWith(dir),
      (files) => new Map(files.map((sf) => [basename(sf.fileName), findPlainDateCasts(sf).length])),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

const scanSrc = (): Readonly<{
  unscanned: readonly string[];
  casts: ReadonlyMap<string, readonly number[]>;
}> => {
  const onDisk = walkFiles(join(PROJECT_ROOT, 'src'), { ext: '.ts' });
  const rel = (abs: string): string => abs.slice(PROJECT_ROOT.length + 1);
  return withProject(
    join(PROJECT_ROOT, 'tsconfig.json'),
    (abs) => rel(abs).startsWith('src/'),
    (files) => {
      const seen = new Set(files.map((sf) => rel(sf.fileName)));
      return {
        unscanned: onDisk.filter((p) => !seen.has(p)),
        casts: new Map(
          files
            .map((sf) => [rel(sf.fileName), findPlainDateCasts(sf)] as const)
            .filter(([, lines]) => lines.length > 0),
        ),
      };
    },
  );
};

describe('PLAIN-DATE-NO-CAST — PlainDate só nasce dentro de plain-date.ts', () => {
  const fixtures = scanFixtures();
  const src = scanSrc();

  it('todo fixture do detector foi entregue pelo compilador', () => {
    assert.deepEqual([...fixtures.keys()].sort(), CAST_FIXTURES.map((f) => f.file).sort());
  });

  it('o detector acusa cast por alias, namespace, Brand, <T> e as unknown as, e deixa passar anotação e outros tipos', () => {
    const wrong = CAST_FIXTURES.filter((f) => fixtures.get(f.file) !== f.casts).map(
      (f) => `${f.file}: esperado ${String(f.casts)}, achado ${String(fixtures.get(f.file))}`,
    );
    assert.deepEqual(wrong, []);
  });

  it('todo .ts de src/ no disco, versionado ou não, é varrido', () => {
    assert.deepEqual(src.unscanned, []);
  });

  it('nenhum arquivo de src/ fora de plain-date.ts faz asserção de tipo para PlainDate', () => {
    const offenders = [...src.casts]
      .filter(([file]) => file !== PLAIN_DATE_MODULE)
      .flatMap(([file, lines]) => lines.map((line) => `${file}:${String(line)}`));
    assert.deepEqual(
      offenders,
      [],
      `PlainDate forjado por cast — use PlainDate.from ou PlainDate.fromDate:\n${offenders.join('\n')}`,
    );
  });

  it('contraprova: em plain-date.ts a varredura acha exatamente os dois casts, o de from e o de fromDate', () => {
    assert.equal(src.casts.get(PLAIN_DATE_MODULE)?.length, 2);
  });
});
