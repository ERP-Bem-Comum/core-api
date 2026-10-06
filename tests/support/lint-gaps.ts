/**
 * LINT-GAPS — as três regras do ESLint que o `oxlint` não tem, reimplementadas sobre a AST do
 * TypeScript 7: proibição de `class`, `naming-convention` e `member-ordering`.
 *
 * Cada função é PURA sobre uma `SourceFile` e devolve achados com linha. Quem decide o escopo
 * (quais arquivos, quais exceções) é o gate em `tests/cleanup/lint-gaps.test.ts`; quem prova que a
 * regra acusa o que deve é `tests/support/lint-gaps.test.ts`.
 *
 * A semântica é PORTADA, não reinventada: cada decisão abaixo cita o trecho do
 * `@typescript-eslint/eslint-plugin@8.59.3` que ela traduz (`naming-convention.js`,
 * `naming-convention-utils/validator.js`, `format.js`, `member-ordering.js`). Portar de memória foi
 * o que fez a migração de setembro perder uma regra sem ninguém notar.
 */

import { SyntaxKind, lineOf } from './ts-ast.ts';
import type { Node, SourceFile } from './ts-ast.ts';

/** Um achado: a regra violada, onde, e o nome envolvido (para a mensagem e para a allowlist). */
export type GapFinding = Readonly<{
  rule: 'no-class' | 'naming-convention' | 'member-ordering';
  line: number;
  name: string;
  detail: string;
}>;

/**
 * Visão estrutural mínima de um nó: só as propriedades que as regras leem. A AST `unstable/` tipa
 * cada nó separadamente; esta visão evita uma cascata de casts por tipo de nó.
 */
type NodeView = Node &
  Readonly<{
    name?: Node;
    propertyName?: Node;
    initializer?: Node;
    type?: Node;
    text?: string;
    members?: readonly Node[];
    parameters?: readonly Node[];
    elements?: readonly Node[];
    expression?: Node;
  }>;

const view = (node: Node): NodeView => node as NodeView;

/** Texto do nome: `Identifier.text`, ou o valor do literal usado como chave. */
const nameText = (node: Node): string => view(node).text ?? '';

/** Desce na árvore inteira, pré-ordem. */
const walk = (node: Node, visit: (n: Node) => void): void => {
  visit(node);
  node.forEachChild((child) => {
    walk(child, visit);
    return undefined;
  });
};

// ---------------------------------------------------------------------------------------------
// no-class — `no-restricted-syntax` com seletores `ClassDeclaration` e `ClassExpression`
// ---------------------------------------------------------------------------------------------

/**
 * Toda declaração ou expressão de classe, nomeada ou não.
 * @param sf - Arquivo a varrer.
 * @returns Um achado por classe.
 * @remarks
 * Por AST, não por regex: `foo(class {})`, `return class {}` e `export default class {}` não têm
 * a forma `class Nome` que um padrão textual procura.
 */
export const findClasses = (sf: SourceFile): readonly GapFinding[] => {
  const out: GapFinding[] = [];
  walk(sf, (n) => {
    if (n.kind === SyntaxKind.ClassDeclaration || n.kind === SyntaxKind.ClassExpression) {
      const name = view(n).name;
      out.push({
        rule: 'no-class',
        line: lineOf(sf, n),
        name: name === undefined ? '(anônima)' : nameText(name),
        detail: 'Classes são proibidas no projeto — use `type Readonly<{}>` + funções standalone.',
      });
    }
  });
  return out;
};

// ---------------------------------------------------------------------------------------------
// member-ordering — config padrão, aplicada a `interface` e type literal
// ---------------------------------------------------------------------------------------------

/**
 * Posição relativa de cada tipo de membro na `defaultOrder` do typescript-eslint.
 * @remarks
 * `member-ordering.js` `getNodeType` + `getRank` com `supportsModifiers = false` (interface e type
 * literal): índice e índice readonly → `signature`; propriedade (readonly ou não) → `field`; o
 * resto pelo próprio tipo. Só a ORDEM relativa importa, então os números são compactos.
 */
const MEMBER_RANK: ReadonlyMap<SyntaxKind, number> = new Map([
  [SyntaxKind.IndexSignature, 0],
  [SyntaxKind.CallSignature, 1],
  [SyntaxKind.PropertySignature, 2],
  [SyntaxKind.ConstructSignature, 3],
  [SyntaxKind.GetAccessor, 4],
  [SyntaxKind.SetAccessor, 5],
  [SyntaxKind.MethodSignature, 6],
]);

const MEMBER_LABEL: ReadonlyMap<number, string> = new Map([
  [0, 'signature'],
  [1, 'call-signature'],
  [2, 'field'],
  [3, 'constructor'],
  [4, 'get'],
  [5, 'set'],
  [6, 'method'],
]);

/**
 * Membros de `interface`/type literal fora da ordem padrão.
 * @param sf - Arquivo a varrer.
 * @returns Um achado por membro que aparece depois de um grupo de posição maior.
 * @remarks
 * `checkGroupSort`: compara com o MAIOR grupo já aceito; o membro fora de ordem é reportado e não
 * altera o grupo corrente.
 */
export const findMemberOrder = (sf: SourceFile): readonly GapFinding[] => {
  const out: GapFinding[] = [];
  walk(sf, (n) => {
    if (n.kind !== SyntaxKind.InterfaceDeclaration && n.kind !== SyntaxKind.TypeLiteral) return;
    let highest = -1;
    for (const member of view(n).members ?? []) {
      const rank = MEMBER_RANK.get(member.kind);
      if (rank === undefined) continue;
      if (rank < highest) {
        const memberName = view(member).name;
        out.push({
          rule: 'member-ordering',
          line: lineOf(sf, member),
          name:
            memberName === undefined ? `(${MEMBER_LABEL.get(rank) ?? '?'})` : nameText(memberName),
          detail: `membro do grupo \`${MEMBER_LABEL.get(rank) ?? '?'}\` deve vir antes de \`${MEMBER_LABEL.get(highest) ?? '?'}\``,
        });
      } else {
        highest = rank;
      }
    }
  });
  return out;
};

// ---------------------------------------------------------------------------------------------
// naming-convention — a configuração do `eslint.config.js`, traduzida
// ---------------------------------------------------------------------------------------------

type Format = 'camelCase' | 'PascalCase' | 'UPPER_CASE';

/** Uma entrada da config, já com o que o validador lê. */
type NamingConfig = Readonly<{
  formats: readonly Format[] | null;
  leading?: 'allow' | 'forbid';
  trailing?: 'allow' | 'forbid';
  /** `filter` com `match: false`: nomes que casam o padrão PULAM esta entrada. */
  skipIf?: RegExp;
}>;

/** `selector: 'default'` — a última entrada de toda lista. */
const DEFAULT: NamingConfig = { formats: ['camelCase'], leading: 'allow', trailing: 'forbid' };

/**
 * Entradas aplicáveis por seletor, já na ordem de precedência do `createValidator`
 * (`validator.js` `sort`): seletor individual antes do grupo (`typeLike`), grupo antes do
 * `default`. Seletor sem entrada própria cai direto no `default`.
 */
const NAMING: Readonly<Record<string, readonly NamingConfig[]>> = {
  variable: [{ formats: ['camelCase', 'UPPER_CASE', 'PascalCase'], leading: 'allow' }, DEFAULT],
  function: [{ formats: ['camelCase', 'PascalCase'] }, DEFAULT],
  parameter: [{ formats: ['camelCase'], leading: 'allow' }, DEFAULT],
  typeLike: [{ formats: ['PascalCase'] }, DEFAULT],
  typeProperty: [{ formats: ['camelCase'], leading: 'allow', skipIf: /[- ]/ }, DEFAULT],
  objectLiteralProperty: [{ formats: null }, DEFAULT],
  enumMember: [{ formats: ['PascalCase'] }, DEFAULT],
  import: [{ formats: ['camelCase', 'PascalCase'] }, DEFAULT],
  member: [DEFAULT],
};

/** `format.js` `validateUnderscores`: sem `_` no início, no fim nem duplo. */
const validUnderscores = (s: string): boolean =>
  !s.startsWith('_') && !s.endsWith('_') && !s.includes('__');

/** `format.js`: as três checagens usadas pela config — exatamente como lá, sem regex. */
const FORMAT_CHECK: Readonly<Record<Format, (name: string) => boolean>> = {
  camelCase: (s) => {
    const first = s.charAt(0);
    return s.length === 0 || (first === first.toLowerCase() && !s.includes('_'));
  },
  PascalCase: (s) => {
    const first = s.charAt(0);
    return s.length === 0 || (first === first.toUpperCase() && !s.includes('_'));
  },
  UPPER_CASE: (s) => s.length === 0 || (s === s.toUpperCase() && validUnderscores(s)),
};

/** ZWNJ e ZWJ continuam identificador (ECMA-262 `IdentifierPartChar`); invisíveis, por código. */
const JOINERS = String.fromCodePoint(0x200c, 0x200d);

/** Nome que só pode ser escrito entre aspas (`'a-b'`, `'1'`) — `requiresQuoting` do plugin. */
const IDENTIFIER_TEXT = new RegExp(`^[\\p{ID_Start}$_][\\p{ID_Continue}$${JOINERS}]*$`, 'u');

/**
 * Valida um nome contra a lista de entradas do seletor.
 * @returns `null` se passa; a razão da falha, caso contrário.
 * @remarks
 * `validator.js`: a PRIMEIRA entrada que se aplica decide — passou ou falhou, as seguintes não são
 * consultadas. Só o `filter` faz pular para a próxima. Underscore sem opção não é aparado, e cai
 * na checagem de formato (onde `_` reprova camelCase e PascalCase).
 */
const validateName = (
  name: string,
  configs: readonly NamingConfig[],
  requiresQuotes: boolean,
): string | null => {
  for (const config of configs) {
    if (config.skipIf?.test(name) === true) continue;
    let rest = name;
    if (config.leading === 'allow' && rest.startsWith('_')) rest = rest.slice(1);
    if (config.leading === 'forbid' && rest.startsWith('_')) return 'underscore inicial proibido';
    if (config.trailing === 'allow' && rest.endsWith('_')) rest = rest.slice(0, -1);
    if (config.trailing === 'forbid' && rest.endsWith('_')) return 'underscore final proibido';
    if (config.formats === null || config.formats.length === 0) return null;
    if (!requiresQuotes && config.formats.some((f) => FORMAT_CHECK[f](rest))) return null;
    return `deve ser ${config.formats.join(' | ')}`;
  }
  return null;
};

const isLiteralKey = (node: Node): boolean =>
  node.kind === SyntaxKind.StringLiteral || node.kind === SyntaxKind.NumericLiteral;

/** Chave nomeável: identificador ou literal; computada e `#privada` ficam de fora. */
const isPlainKey = (node: Node | undefined): node is Node =>
  node !== undefined && (node.kind === SyntaxKind.Identifier || isLiteralKey(node));

/** Remove parênteses: o `typescript-estree` não os representa, então o plugin nunca os vê. */
const unwrap = (node: Node | undefined): Node | undefined => {
  let cur = node;
  while (
    cur !== undefined &&
    (cur.kind === SyntaxKind.ParenthesizedExpression || cur.kind === SyntaxKind.ParenthesizedType)
  ) {
    cur = view(cur).expression ?? view(cur).type;
  }
  return cur;
};

const isFunctionValue = (node: Node | undefined): boolean => {
  const v = unwrap(node);
  return v?.kind === SyntaxKind.ArrowFunction || v?.kind === SyntaxKind.FunctionExpression;
};

/** `getIdentifiersFromPattern`: todo identificador que um padrão de desestruturação declara. */
const boundIdentifiers = (name: Node | undefined): readonly Node[] => {
  if (name === undefined) return [];
  if (name.kind === SyntaxKind.Identifier) return [name];
  if (
    name.kind === SyntaxKind.ObjectBindingPattern ||
    name.kind === SyntaxKind.ArrayBindingPattern
  ) {
    return (view(name).elements ?? [])
      .filter((el) => el.kind === SyntaxKind.BindingElement)
      .flatMap((el) => boundIdentifiers(view(el).name));
  }
  return [];
};

/**
 * Funções cujos PARÂMETROS o plugin valida (`FunctionDeclaration, TSDeclareFunction,
 * TSEmptyBodyFunctionExpression, FunctionExpression, ArrowFunctionExpression`). Método de objeto,
 * getter e setter viram `FunctionExpression` no ESTree. Assinatura de TIPO (`(x: T) => void`,
 * `m(x): void` em interface) não está na lista — parâmetro de tipo função não é validado.
 */
const PARAM_OWNERS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
  SyntaxKind.Constructor,
]);

const TYPE_LIKE: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.InterfaceDeclaration,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.EnumDeclaration,
  SyntaxKind.ClassDeclaration,
  SyntaxKind.ClassExpression,
]);

type NamingTarget = readonly [selector: keyof typeof NAMING, id: Node];

/**
 * Os nomes que um nó DECLARA, cada um com o seletor do plugin que o valida.
 * @param n - Nó qualquer da árvore.
 * @returns Zero ou mais pares seletor/identificador. Parâmetros ficam de fora: são tratados à
 * parte, porque um mesmo nó (uma função nomeada) declara nome E parâmetros.
 * @remarks
 * Cadeia de `if` em vez de `switch`: `SyntaxKind` tem centenas de membros, e a exaustividade que o
 * lint cobra num `switch` sobre ele não teria sentido aqui.
 */
const namingTargets = (n: Node): readonly NamingTarget[] => {
  const v = view(n);
  const parentKind = n.parent?.kind;
  const named = (selector: keyof typeof NAMING): readonly NamingTarget[] =>
    v.name === undefined ? [] : [[selector, v.name]];
  const keyed = (selector: keyof typeof NAMING): readonly NamingTarget[] =>
    isPlainKey(v.name) ? [[selector, v.name]] : [];

  if (n.kind === SyntaxKind.FunctionDeclaration || n.kind === SyntaxKind.FunctionExpression) {
    return named('function');
  }
  if (n.kind === SyntaxKind.VariableDeclaration) {
    // `catch (e)` é VariableDeclaration aqui e Identifier solto no ESTree — o plugin não valida.
    if (parentKind === SyntaxKind.CatchClause) return [];
    return boundIdentifiers(v.name).map((id): NamingTarget => ['variable', id]);
  }
  if (n.kind === SyntaxKind.ImportClause || n.kind === SyntaxKind.NamespaceImport) {
    return named('import');
  }
  if (n.kind === SyntaxKind.ImportSpecifier) {
    // `import { default as X }` é o único especificador nomeado que o plugin valida.
    const isDefault = v.propertyName !== undefined && nameText(v.propertyName) === 'default';
    return isDefault ? named('import') : [];
  }
  if (n.kind === SyntaxKind.PropertyAssignment) {
    if (parentKind !== SyntaxKind.ObjectLiteralExpression) return [];
    return keyed(isFunctionValue(v.initializer) ? 'member' : 'objectLiteralProperty');
  }
  if (
    n.kind === SyntaxKind.MethodDeclaration ||
    n.kind === SyntaxKind.GetAccessor ||
    n.kind === SyntaxKind.SetAccessor ||
    n.kind === SyntaxKind.MethodSignature
  ) {
    return keyed('member');
  }
  if (n.kind === SyntaxKind.PropertySignature) {
    return keyed(unwrap(v.type)?.kind === SyntaxKind.FunctionType ? 'member' : 'typeProperty');
  }
  if (n.kind === SyntaxKind.TypeParameter) {
    // `TSTypeParameterDeclaration > TSTypeParameter`: o de mapped type e o de `infer` ficam fora.
    const outside = parentKind === SyntaxKind.MappedType || parentKind === SyntaxKind.InferType;
    return outside ? [] : named('typeLike');
  }
  if (n.kind === SyntaxKind.EnumMember) return named('enumMember');
  if (TYPE_LIKE.has(n.kind)) return named('typeLike');
  return [];
};

/**
 * Violações de `naming-convention` na config do projeto.
 * @param sf - Arquivo a varrer.
 * @returns Um achado por nome fora do formato do seu seletor.
 */
export const findNaming = (sf: SourceFile): readonly GapFinding[] => {
  const out: GapFinding[] = [];
  const check = (selector: keyof typeof NAMING, id: Node): void => {
    const name = nameText(id);
    const requiresQuotes = isLiteralKey(id) && !IDENTIFIER_TEXT.test(name);
    const reason = validateName(name, NAMING[selector] ?? [DEFAULT], requiresQuotes);
    if (reason !== null) {
      out.push({
        rule: 'naming-convention',
        line: lineOf(sf, id),
        name,
        detail: `${selector}: ${reason}`,
      });
    }
  };

  walk(sf, (n) => {
    const parentKind = n.parent?.kind;
    const isTypeMember =
      parentKind === SyntaxKind.TypeLiteral || parentKind === SyntaxKind.InterfaceDeclaration;
    if (PARAM_OWNERS.has(n.kind) && !isTypeMember) {
      for (const param of view(n).parameters ?? []) {
        for (const id of boundIdentifiers(view(param).name)) check('parameter', id);
      }
    }
    for (const [selector, id] of namingTargets(n)) check(selector, id);
  });
  return out;
};
