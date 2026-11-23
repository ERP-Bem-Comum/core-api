import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { PROJECT_ROOT } from '../support/source-scan.ts';
import { SyntaxKind, lineOf, withSourceFiles } from '../support/ts-ast.ts';
import type { Node, SourceFile } from '../support/ts-ast.ts';

/** Visão estrutural mínima dos nós que o detector lê. */
type NodeView = Node &
  Readonly<{
    text?: string;
    name?: Node;
    propertyName?: Node;
    type?: Node;
    typeName?: Node;
    types?: readonly Node[];
    typeArguments?: readonly Node[];
    members?: readonly Node[];
    modifiers?: readonly Node[];
    right?: Node;
  }>;

/** Nome de tipo brandado mapeado para o conjunto de arquivos que o declaram. */
type BrandOwners = ReadonlyMap<string, ReadonlySet<string>>;

/** Cast para tipo brandado: arquivo, linha e nome do tipo-alvo. */
type BrandCast = Readonly<{ file: string; line: number; brand: string }>;

/** Nome dado ao alvo `Brand<…>` escrito direto no cast, que não tem arquivo dono. */
const INLINE_BRAND = 'Brand<…>';

/** Nome dado ao alvo que é interseção com membro-marcador escrita direto no cast. */
const INLINE_MARKER = '& { readonly __… }';

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

const topLevel = (sf: SourceFile): readonly Node[] => {
  const nodes: Node[] = [];
  sf.forEachChild((child) => {
    nodes.push(child);
    return undefined;
  });
  return nodes;
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

const referencedName = (ref: NodeView): string => {
  const typeName = ref.typeName;
  if (typeName === undefined) return '';
  return typeName.kind === SyntaxKind.QualifiedName
    ? textOf(view(typeName).right)
    : textOf(typeName);
};

const isBrandReference = (node: Node): boolean =>
  node.kind === SyntaxKind.TypeReference && referencedName(view(node)) === 'Brand';

const isReadonlyMarker = (member: Node): boolean =>
  member.kind === SyntaxKind.PropertySignature &&
  (view(member).modifiers ?? []).some((m) => m.kind === SyntaxKind.ReadonlyKeyword) &&
  textOf(view(member).name).startsWith('__');

const isMarkerLiteral = (node: Node): boolean =>
  node.kind === SyntaxKind.TypeLiteral && (view(node).members ?? []).some(isReadonlyMarker);

/**
 * Diz se a definição de um type alias é brandada: `Brand<…>`, ou interseção que contém `Brand<…>`
 * ou um type literal com membro `readonly` de nome iniciado por `__`.
 *
 * @param type - Nó do tipo à direita do `=` no type alias.
 * @returns `true` quando a definição é brandada; `false` caso contrário.
 */
const isBrandDefinition = (type: Node): boolean => {
  const t = unwrapParens(type);
  if (isBrandReference(t)) return true;
  if (t.kind !== SyntaxKind.IntersectionType) return false;
  return (view(t).types ?? []).some((m) => {
    const member = unwrapParens(m);
    return isBrandReference(member) || isMarkerLiteral(member);
  });
};

/**
 * Mapeia cada tipo brandado declarado no nível do módulo para o conjunto de arquivos que o
 * declaram; um nome declarado em dois arquivos fica com os dois.
 *
 * @param files - Arquivo relativo e sua `SourceFile`.
 * @returns O mapa nome → arquivos donos.
 */
const collectBrandOwners = (files: ReadonlyMap<string, SourceFile>): BrandOwners => {
  const owners = new Map<string, Set<string>>();
  for (const [file, sf] of files) {
    for (const node of topLevel(sf)) {
      const v = view(node);
      if (node.kind !== SyntaxKind.TypeAliasDeclaration || v.type === undefined) continue;
      if (!isBrandDefinition(v.type)) continue;
      const name = textOf(v.name);
      const set = owners.get(name) ?? new Set<string>();
      set.add(file);
      owners.set(name, set);
    }
  }
  return owners;
};

/** Declarações de tipo locais de um arquivo e os nomes que ele importa, já desfeito o alias. */
type LocalScope = Readonly<{
  aliases: ReadonlyMap<string, Node>;
  shadowed: ReadonlySet<string>;
  imports: ReadonlyMap<string, string>;
}>;

const localScope = (sf: SourceFile): LocalScope => {
  const aliases = new Map<string, Node>();
  const shadowed = new Set<string>();
  const imports = new Map<string, string>();
  for (const node of topLevel(sf)) {
    const v = view(node);
    if (node.kind === SyntaxKind.TypeAliasDeclaration && v.type !== undefined) {
      if (!isBrandDefinition(v.type)) aliases.set(textOf(v.name), v.type);
    } else if (node.kind === SyntaxKind.InterfaceDeclaration) {
      shadowed.add(textOf(v.name));
    }
  }
  walk(sf, (n) => {
    if (n.kind !== SyntaxKind.ImportSpecifier) return;
    const v = view(n);
    imports.set(textOf(v.name), textOf(v.propertyName ?? v.name));
  });
  return { aliases, shadowed, imports };
};

/** Nós de tipo que embrulham outros tipos e cujos filhos o detector percorre. */
const WRAPPER_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.ArrayType,
  SyntaxKind.TypeOperator,
  SyntaxKind.TupleType,
  SyntaxKind.NamedTupleMember,
  SyntaxKind.RestType,
  SyntaxKind.OptionalType,
]);

const childrenOf = (node: Node): readonly Node[] => {
  const children: Node[] = [];
  node.forEachChild((child) => {
    children.push(child);
    return undefined;
  });
  return children;
};

const brandsDenoted = (
  type: Node,
  scope: LocalScope,
  owners: BrandOwners,
  seen: ReadonlySet<string>,
): readonly string[] => {
  const t = unwrapParens(type);
  const v = view(t);
  const recurse = (nodes: readonly Node[]): readonly string[] =>
    nodes.flatMap((m) => brandsDenoted(m, scope, owners, seen));
  if (t.kind === SyntaxKind.UnionType || t.kind === SyntaxKind.IntersectionType) {
    const inner = recurse(v.types ?? []);
    const marker =
      t.kind === SyntaxKind.IntersectionType &&
      (v.types ?? []).some((m) => isMarkerLiteral(unwrapParens(m)));
    return marker ? [...inner, INLINE_MARKER] : inner;
  }
  if (WRAPPER_KINDS.has(t.kind)) return recurse(childrenOf(t));
  if (t.kind !== SyntaxKind.TypeReference || v.typeName === undefined) return [];
  if (isBrandReference(t)) return [INLINE_BRAND];
  const fromArguments = recurse(v.typeArguments ?? []);
  const name = referencedName(v);
  if (v.typeName.kind === SyntaxKind.QualifiedName) {
    return owners.has(name) ? [name, ...fromArguments] : fromArguments;
  }
  if (scope.shadowed.has(name)) return fromArguments;
  const alias = scope.aliases.get(name);
  if (alias !== undefined) {
    if (seen.has(name)) return fromArguments;
    return [...brandsDenoted(alias, scope, owners, new Set([...seen, name])), ...fromArguments];
  }
  const original = scope.imports.get(name) ?? name;
  return owners.has(original) ? [original, ...fromArguments] : fromArguments;
};

/**
 * Casts (`expr as T`, `<T>expr`, inclusive `as unknown as T`) cujo alvo é tipo brandado e cujo
 * arquivo não está entre os donos desse tipo. O alvo é resolvido por nome, por alias de import,
 * por `Namespace.Nome`, por type alias local, por união e interseção, por array (`T[]`,
 * `readonly T[]`), por tupla e pelos argumentos de tipo de qualquer referência (`Readonly<T>`,
 * `Promise<T>`, `Result<T, E>`); `Brand<…>` ou interseção com membro-marcador escritos direto no
 * cast não têm dono e são sempre achados. Não acha o tipo brandado que só aparece como membro de
 * um type literal (`{ total: Money }`) nem o cast feito dentro de helper genérico (`x as T`
 * chamado como `cast<Money>(…)`).
 *
 * @param file - Caminho relativo do arquivo.
 * @param sf - A `SourceFile` do arquivo.
 * @param owners - Mapa de {@link collectBrandOwners}.
 * @returns Os casts achados, em ordem de linha.
 */
const findForeignBrandCasts = (
  file: string,
  sf: SourceFile,
  owners: BrandOwners,
): readonly BrandCast[] => {
  const scope = localScope(sf);
  const found: BrandCast[] = [];
  walk(sf, (n) => {
    if (n.kind !== SyntaxKind.AsExpression && n.kind !== SyntaxKind.TypeAssertionExpression) return;
    const target = view(n).type;
    if (target === undefined) return;
    for (const brand of brandsDenoted(target, scope, owners, new Set())) {
      if (owners.get(brand)?.has(file) === true) continue;
      found.push({ file, line: lineOf(sf, n), brand });
    }
  });
  return found;
};

/**
 * Casts para tipo brandado feitos no próprio arquivo que declara o tipo.
 *
 * @param file - Caminho relativo do arquivo.
 * @param sf - A `SourceFile` do arquivo.
 * @param owners - Mapa de {@link collectBrandOwners}.
 * @returns `arquivo:linha` de cada cast permitido.
 */
const findOwnBrandCasts = (
  file: string,
  sf: SourceFile,
  owners: BrandOwners,
): readonly string[] => {
  const scope = localScope(sf);
  const found: string[] = [];
  walk(sf, (n) => {
    if (n.kind !== SyntaxKind.AsExpression && n.kind !== SyntaxKind.TypeAssertionExpression) return;
    const target = view(n).type;
    if (target === undefined) return;
    if (
      brandsDenoted(target, scope, owners, new Set()).some((b) => owners.get(b)?.has(file) === true)
    ) {
      found.push(`${file}:${String(lineOf(sf, n))}`);
    }
  });
  return found;
};

/** Resultado da varredura de um conjunto de arquivos. */
type Scan = Readonly<{
  owners: BrandOwners;
  foreign: readonly string[];
  own: readonly string[];
  unparsed: readonly string[];
}>;

const formatCast = (c: BrandCast): string => `${c.file}:${String(c.line)} (${c.brand})`;

const scan = (root: string, relPaths: readonly string[]): Scan =>
  withSourceFiles(
    relPaths.map((p) => join(root, p)),
    (byAbs) => {
      const files = new Map<string, SourceFile>();
      const unparsed: string[] = [];
      for (const rel of relPaths) {
        const sf = byAbs.get(join(root, rel));
        if (sf === undefined) unparsed.push(rel);
        else files.set(rel, sf);
      }
      const owners = collectBrandOwners(files);
      const foreign: string[] = [];
      const own: string[] = [];
      for (const [rel, sf] of files) {
        foreign.push(...findForeignBrandCasts(rel, sf, owners).map(formatCast));
        own.push(...findOwnBrandCasts(rel, sf, owners));
      }
      return { owners, foreign, own, unparsed };
    },
  );

/** Um arquivo de fixture e os achados `arquivo:linha (tipo)` que o detector deve devolver nele. */
type CastFixture = Readonly<{ file: string; code: string; expected: readonly string[] }>;

/** Casos adversos que o detector deve acusar e vizinhos válidos que ele deve deixar passar. */
const CAST_FIXTURES: readonly CastFixture[] = [
  {
    file: 'kernel/money.ts',
    code: `import type { Brand } from './brand.ts';\nexport type Money = Brand<{ readonly cents: number }, 'Money'>;\nexport const mk = (cents: number) => ({ cents }) as Money;`,
    expected: [],
  },
  {
    file: 'kernel/non-zero.ts',
    code: `import type { Money } from './money.ts';\nexport type NonZeroMoney = Money & { readonly __nonZeroMoney: true };\nexport const from = (m: Money) => m as NonZeroMoney;`,
    expected: [],
  },
  {
    file: 'kernel/cpf.ts',
    code: `import type { Brand } from './brand.ts';\nexport type Cpf = Brand<string, 'Cpf'>;\nexport const mk = (raw: string) => raw as Cpf;`,
    expected: [],
  },
  {
    file: 'auth/cpf.ts',
    code: `import type { Brand } from '../kernel/brand.ts';\nexport type Cpf = Brand<string, 'Cpf'>;\nexport const mk = (raw: string) => raw as Cpf;`,
    expected: [],
  },
  {
    file: 'outside/as-money.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (raw: object) => raw as Money;`,
    expected: ['outside/as-money.ts:2 (Money)'],
  },
  {
    file: 'outside/as-unknown-as-money.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (cents: number) =>\n  ({ cents }) as unknown as Money;`,
    expected: ['outside/as-unknown-as-money.ts:3 (Money)'],
  },
  {
    file: 'outside/angle-bracket.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (raw: object) => <Money>raw;`,
    expected: ['outside/angle-bracket.ts:2 (Money)'],
  },
  {
    file: 'outside/import-alias.ts',
    code: `import type { Money as Cash } from '../kernel/money.ts';\nexport const f = (raw: object) => raw as Cash;`,
    expected: ['outside/import-alias.ts:2 (Money)'],
  },
  {
    file: 'outside/namespace.ts',
    code: `import * as M from '../kernel/money.ts';\nexport const f = (raw: object) => raw as M.Money;`,
    expected: ['outside/namespace.ts:2 (Money)'],
  },
  {
    file: 'outside/non-zero.ts',
    code: `import type { Money } from '../kernel/money.ts';\nimport type { NonZeroMoney } from '../kernel/non-zero.ts';\nexport const f = (m: Money) => m as NonZeroMoney;`,
    expected: ['outside/non-zero.ts:3 (NonZeroMoney)'],
  },
  {
    file: 'outside/intersection-and-parens.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (raw: object) => raw as Money & { extra: 1 };\nexport const g = (raw: object) => raw as (Money);`,
    expected: [
      'outside/intersection-and-parens.ts:2 (Money)',
      'outside/intersection-and-parens.ts:3 (Money)',
    ],
  },
  {
    file: 'outside/union.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (raw: object) => raw as Money | null;`,
    expected: ['outside/union.ts:2 (Money)'],
  },
  {
    file: 'outside/local-alias.ts',
    code: `import type { Money } from '../kernel/money.ts';\ntype Cash = Money;\ntype Till = Cash;\nexport const f = (raw: object) => raw as Till;`,
    expected: ['outside/local-alias.ts:4 (Money)'],
  },
  {
    file: 'outside/inline-brand.ts',
    code: `import type { Brand } from '../kernel/brand.ts';\nexport const f = (raw: string) => raw as Brand<string, 'Money'>;`,
    expected: [`outside/inline-brand.ts:2 (${INLINE_BRAND})`],
  },
  {
    file: 'outside/inline-marker.ts',
    code: `export const f = (raw: string) => raw as string & { readonly __tag: true };`,
    expected: [`outside/inline-marker.ts:1 (${INLINE_MARKER})`],
  },
  {
    file: 'outside/cpf-user.ts',
    code: `import type { Cpf } from '../kernel/cpf.ts';\nexport const f = (raw: string) => raw as Cpf;`,
    expected: ['outside/cpf-user.ts:2 (Cpf)'],
  },
  {
    file: 'outside/array.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (raw: object) => raw as Money[];\nexport const g = (raw: object) => raw as readonly Money[];\nexport const h = (raw: object) => raw as Array<Money>;`,
    expected: [
      'outside/array.ts:2 (Money)',
      'outside/array.ts:3 (Money)',
      'outside/array.ts:4 (Money)',
    ],
  },
  {
    file: 'outside/type-arguments.ts',
    code: `import type { Money } from '../kernel/money.ts';\nimport type { NonZeroMoney } from '../kernel/non-zero.ts';\nimport type { Result } from './result.ts';\nexport const f = (x: object) => x as Readonly<NonZeroMoney>;\nexport const g = (r: object) => r as Result<Money, 'e'>;\nexport const h = (p: object) => p as Promise<Money>;`,
    expected: [
      'outside/type-arguments.ts:4 (NonZeroMoney)',
      'outside/type-arguments.ts:5 (Money)',
      'outside/type-arguments.ts:6 (Money)',
    ],
  },
  {
    file: 'outside/tuple.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (raw: object) => raw as readonly [Money, number];\nexport const h = (raw: object) => raw as [first: Money, ...rest: Money[]];\nexport const i = (raw: object) => raw as [Money?];`,
    expected: [
      'outside/tuple.ts:2 (Money)',
      'outside/tuple.ts:3 (Money)',
      'outside/tuple.ts:3 (Money)',
      'outside/tuple.ts:4 (Money)',
    ],
  },
  {
    file: 'outside/record-member.ts',
    code: `import type { Money } from '../kernel/money.ts';\ntype Active = Readonly<{ total: Money; status: 'Active' }>;\nexport const g = (raw: object) => raw as { readonly total: Money };\nexport const h = (raw: object) => raw as Active;`,
    expected: [],
  },
  {
    file: 'outside/generic-helper.ts',
    code: `import type { Money } from '../kernel/money.ts';\nconst cast = <T,>(x: unknown) => x as T;\nexport const m = cast<Money>({ cents: -5 });`,
    expected: [],
  },
  {
    file: 'valid/wrappers-without-brand.ts',
    code: `export const f = (raw: object) => raw as readonly string[];\nexport const g = (raw: object) => raw as Promise<number>;\nexport const h = (raw: object) => raw as Readonly<{ cents: number }>;\nexport const i = (raw: object) => raw as [number, string];\nexport const j = (raw: object) => raw as { readonly total: number };`,
    expected: [],
  },
  {
    file: 'valid/satisfies.ts',
    code: `import type { Money } from '../kernel/money.ts';\nimport { mk } from '../kernel/money.ts';\nexport const m = mk(1) satisfies Money;`,
    expected: [],
  },
  {
    file: 'valid/annotation-and-other-casts.ts',
    code: `import type { Money } from '../kernel/money.ts';\nexport const f = (m: Money): Money => m;\nexport const g = (raw: unknown) => raw as string;\nexport const h = [1] as const;`,
    expected: [],
  },
  {
    file: 'valid/mention-only.ts',
    code: `export const s = 'raw as Money';\nexport const t = \`raw as NonZeroMoney\`;`,
    expected: [],
  },
  {
    file: 'valid/local-shadow.ts',
    code: `type Money = { cents: number };\ninterface Cpf { digits: string }\nexport const f = (raw: object) => raw as Money;\nexport const g = (raw: object) => raw as Cpf;`,
    expected: [],
  },
  {
    file: 'valid/plain-readonly-intersection.ts',
    code: `export type Wide = { a: 1 } & { readonly extra: string };\nexport const f = (raw: object) => raw as Wide;`,
    expected: [],
  },
  {
    file: 'valid/wide-user.ts',
    code: `import type { Wide } from './plain-readonly-intersection.ts';\nexport const f = (raw: object) => raw as Wide;`,
    expected: [],
  },
];

const scanFixtures = (): Scan => {
  const dir = mkdtempSync(join(tmpdir(), 'brand-cast-ownership-'));
  try {
    for (const f of CAST_FIXTURES) {
      mkdirSync(dirname(join(dir, f.file)), { recursive: true });
      writeFileSync(join(dir, f.file), `${f.code}\n`);
    }
    return scan(
      dir,
      CAST_FIXTURES.map((f) => f.file),
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

/**
 * Casts para tipo brandado fora do arquivo dono que já existiam em `src/` quando o gate nasceu,
 * como `arquivo (Tipo)` e quantidade. A varredura tem de devolver exatamente este conjunto: um cast
 * novo reprova, e um cast removido reprova até a entrada sair daqui.
 */
const KNOWN_FOREIGN_CASTS: ReadonlyMap<string, number> = new Map([
  [
    'src/modules/contracts/adapters/event-delivery/timeline-projection.delivery.ts (AmendmentId)',
    1,
  ],
  ['src/modules/contracts/adapters/event-delivery/timeline-projection.delivery.ts (ContractId)', 1],
  ['src/modules/contracts/adapters/http/plugin.ts (ContractorId)', 1],
  ['src/modules/contracts/domain/timeline/projection.ts (AmendmentId)', 1],
  ['src/modules/financial/adapters/persistence/mappers/timeline.mapper.ts (DocumentId)', 2],
  ['src/modules/financial/adapters/persistence/mappers/timeline.mapper.ts (PayableId)', 1],
  [
    'src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts (DocumentId)',
    2,
  ],
  [
    'src/modules/financial/adapters/persistence/repos/reconciliation-repository.drizzle.ts (PayableId)',
    2,
  ],
  [
    'src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts (DocumentId)',
    2,
  ],
  [
    'src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts (PayableId)',
    2,
  ],
  ['src/modules/financial/application/use-cases/generate-remittance.ts (DocumentId)', 1],
  ['src/modules/financial/application/use-cases/generate-remittance.ts (PayableId)', 1],
  ['src/modules/notifications/adapters/email/email-config.ts (EmailAddress)', 1],
  ['src/modules/partners/domain/geography/municipality.ts (StateAbbreviation)', 1],
]);

const countByFileAndBrand = (casts: readonly string[]): ReadonlyMap<string, number> => {
  const counts = new Map<string, number>();
  for (const c of casts) {
    const key = c.replace(/:\d+ \(/, ' (');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
};

const sortedEntries = (m: ReadonlyMap<string, number>): readonly (readonly [string, number])[] =>
  [...m].sort(([a], [b]) => a.localeCompare(b));

const trackedSrc = (): readonly string[] =>
  execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', 'src'], {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter((p) => p.endsWith('.ts'));

const ownersOf = (owners: BrandOwners, name: string): readonly string[] =>
  [...(owners.get(name) ?? [])].sort();

describe('BRAND-CAST-OWNERSHIP — o detector, sobre fixtures', () => {
  const fixtures = scanFixtures();

  it('todo fixture é entregue pelo compilador', () => {
    assert.deepEqual(fixtures.unparsed, []);
  });

  it('o mapa de brands tem Brand<…> e interseção com marcador readonly __, e um nome declarado em dois arquivos fica com os dois', () => {
    assert.deepEqual(
      [...fixtures.owners.keys()].sort().map((name) => [name, ownersOf(fixtures.owners, name)]),
      [
        ['Cpf', ['auth/cpf.ts', 'kernel/cpf.ts']],
        ['Money', ['kernel/money.ts']],
        ['NonZeroMoney', ['kernel/non-zero.ts']],
      ],
    );
  });

  for (const f of CAST_FIXTURES) {
    it(`${f.file}: ${f.expected.length === 0 ? 'nenhum achado' : f.expected.join(', ')}`, () => {
      const got = fixtures.foreign.filter((c) => c.startsWith(`${f.file}:`));
      assert.deepEqual(got, f.expected);
    });
  }

  it('contraprova: os casts no arquivo dono são vistos pelo detector e permitidos', () => {
    assert.deepEqual(fixtures.own, [
      'kernel/money.ts:3',
      'kernel/non-zero.ts:3',
      'kernel/cpf.ts:3',
      'auth/cpf.ts:3',
    ]);
  });
});

describe('BRAND-CAST-OWNERSHIP — cast para tipo brandado só no arquivo que declara o tipo', () => {
  const files = trackedSrc();
  const src = scan(PROJECT_ROOT, files);

  it('o git devolve .ts de src/ e o compilador entrega todos', () => {
    assert.ok(files.length > 0, 'git ls-files não devolveu .ts algum em src/');
    assert.deepEqual(src.unparsed, []);
  });

  it('o mapa de brands de src/ acha Money, NonZeroMoney e PlainDate nos arquivos do kernel', () => {
    assert.deepEqual(
      [
        ownersOf(src.owners, 'Money'),
        ownersOf(src.owners, 'NonZeroMoney'),
        ownersOf(src.owners, 'PlainDate'),
      ],
      [
        ['src/shared/kernel/money.ts'],
        ['src/shared/kernel/non-zero-money.ts'],
        ['src/shared/kernel/plain-date.ts'],
      ],
    );
  });

  it('os casts para tipo brandado fora do arquivo dono em src/ são exatamente os de KNOWN_FOREIGN_CASTS', () => {
    assert.deepEqual(
      sortedEntries(countByFileAndBrand(src.foreign)),
      sortedEntries(KNOWN_FOREIGN_CASTS),
      `Tipo brandado forjado por cast fora do arquivo dono — use o smart constructor:\n${src.foreign.join('\n')}`,
    );
  });

  it('nenhum tipo brandado de src/shared/kernel/ aparece em KNOWN_FOREIGN_CASTS', () => {
    const kernelBrands = [...src.owners]
      .filter(([, declaring]) => [...declaring].some((f) => f.startsWith('src/shared/kernel/')))
      .map(([name]) => name);
    const kernelEntries = [...KNOWN_FOREIGN_CASTS.keys()].filter((k) =>
      kernelBrands.some((b) => k.endsWith(` (${b})`)),
    );
    assert.ok(kernelBrands.includes('NonZeroMoney'));
    assert.deepEqual(kernelEntries, []);
  });

  it('contraprova da lista: um cast novo para NonZeroMoney fora do dono muda a contagem e reprova', () => {
    const extra = [...src.foreign, 'src/modules/x/y.ts:1 (NonZeroMoney)'];
    assert.notDeepEqual(
      sortedEntries(countByFileAndBrand(extra)),
      sortedEntries(KNOWN_FOREIGN_CASTS),
    );
  });

  it('contraprova: os casts do construtor em money.ts, non-zero-money.ts e auth/domain/identity/cpf.ts são vistos e permitidos', () => {
    const owned = (prefix: string): boolean => src.own.some((c) => c.startsWith(`${prefix}:`));
    assert.deepEqual(
      [
        owned('src/shared/kernel/money.ts'),
        owned('src/shared/kernel/non-zero-money.ts'),
        owned('src/modules/auth/domain/identity/cpf.ts'),
      ],
      [true, true, true],
    );
  });
});
