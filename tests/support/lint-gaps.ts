/**
 * LINT-GAPS — as três regras do ESLint que o `oxlint` não tem, reimplementadas sobre a AST ESTree
 * do `oxc-parser`: proibição de `class`, `naming-convention` e `member-ordering`.
 *
 * Cada função é PURA sobre um `ParsedFile` e devolve achados com linha. Quem decide o escopo
 * (quais arquivos, quais exceções) é o gate em `tests/cleanup/lint-gaps.test.ts`; quem prova que a
 * regra acusa o que deve é `tests/support/lint-gaps.test.ts`.
 *
 * A semântica é PORTADA, não reinventada: cada decisão abaixo cita o trecho do
 * `@typescript-eslint/eslint-plugin@8.59.3` que ela traduz (`naming-convention.js`,
 * `naming-convention-utils/validator.js`, `format.js`, `member-ordering.js`). Portar de memória foi
 * o que fez a migração de setembro perder uma regra sem ninguém notar.
 *
 * Histórico: até novembro/2026 as regras liam a AST do compilador TS 7 (`typescript/unstable/*`),
 * que só funciona sob Node. Sobre ESTree, os seletores do plugin (`ClassDeclaration`,
 * `TSTypeParameter`, `Property`…) voltam a ser os nomes dos próprios nós.
 */

import { child, children, flag, literalValue, text, walk } from './oxc-ast.ts';
import type { AstNode, ParsedFile } from './oxc-ast.ts';

/** Um achado: a regra violada, onde, e o nome envolvido (para a mensagem e para a allowlist). */
export type GapFinding = Readonly<{
  rule: 'no-class' | 'naming-convention' | 'member-ordering';
  line: number;
  name: string;
  detail: string;
}>;

/** Texto do nome: `Identifier.name`, ou o valor do literal usado como chave. */
const nameText = (node: AstNode): string => {
  const literal = literalValue(node);
  if (literal !== undefined) return String(literal);
  return text(node, 'name') ?? '';
};

// ---------------------------------------------------------------------------------------------
// no-class — `no-restricted-syntax` com seletores `ClassDeclaration` e `ClassExpression`
// ---------------------------------------------------------------------------------------------

/**
 * Toda declaração ou expressão de classe, nomeada ou não.
 * @param file - Arquivo a varrer.
 * @returns Um achado por classe.
 * @remarks
 * Por AST, não por regex: `foo(class {})`, `return class {}` e `export default class {}` não têm
 * a forma `class Nome` que um padrão textual procura.
 */
export const findClasses = (file: ParsedFile): readonly GapFinding[] => {
  const out: GapFinding[] = [];
  walk(file.program, (n) => {
    if (n.type === 'ClassDeclaration' || n.type === 'ClassExpression') {
      const id = child(n, 'id');
      out.push({
        rule: 'no-class',
        line: file.lineOf(n),
        name: id === undefined ? '(anônima)' : nameText(id),
        detail: 'Classes são proibidas no projeto — use `type Readonly<{}>` + funções standalone.',
      });
    }
  });
  return out;
};

// ---------------------------------------------------------------------------------------------
// member-ordering — config padrão, aplicada a `interface` e type literal
// ---------------------------------------------------------------------------------------------

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
 * Posição relativa do membro na `defaultOrder` do typescript-eslint.
 * @remarks
 * `member-ordering.js` `getNodeType` + `getRank` com `supportsModifiers = false` (interface e type
 * literal): índice e índice readonly → `signature`; propriedade (readonly ou não) → `field`;
 * `TSMethodSignature` pelo `kind` (`get`, `set`, `method`). Só a ORDEM relativa importa.
 */
const memberRank = (member: AstNode): number | undefined => {
  switch (member.type) {
    case 'TSIndexSignature':
      return 0;
    case 'TSCallSignatureDeclaration':
      return 1;
    case 'TSPropertySignature':
      return 2;
    case 'TSConstructSignatureDeclaration':
      return 3;
    case 'TSMethodSignature': {
      const kind = text(member, 'kind');
      if (kind === 'get') return 4;
      if (kind === 'set') return 5;
      return 6;
    }
    default:
      return undefined;
  }
};

/** Membros de `interface` (`TSInterfaceBody.body`) ou type literal (`TSTypeLiteral.members`). */
const typeMembers = (n: AstNode): readonly AstNode[] | undefined => {
  if (n.type === 'TSInterfaceBody') return children(n, 'body');
  if (n.type === 'TSTypeLiteral') return children(n, 'members');
  return undefined;
};

/**
 * Membros de `interface`/type literal fora da ordem padrão.
 * @param file - Arquivo a varrer.
 * @returns Um achado por membro que aparece depois de um grupo de posição maior.
 * @remarks
 * `checkGroupSort`: compara com o MAIOR grupo já aceito; o membro fora de ordem é reportado e não
 * altera o grupo corrente.
 */
export const findMemberOrder = (file: ParsedFile): readonly GapFinding[] => {
  const out: GapFinding[] = [];
  walk(file.program, (n) => {
    const members = typeMembers(n);
    if (members === undefined) return;
    let highest = -1;
    for (const member of members) {
      const rank = memberRank(member);
      if (rank === undefined) continue;
      if (rank < highest) {
        const key = child(member, 'key');
        out.push({
          rule: 'member-ordering',
          line: file.lineOf(member),
          name: key === undefined ? `(${MEMBER_LABEL.get(rank) ?? '?'})` : nameText(key),
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

const isLiteralKey = (node: AstNode): boolean => literalValue(node) !== undefined;

/**
 * Chave nomeável de um nó com `key`: identificador ou literal, nunca computada (`[x]`) nem
 * `#privada` (`PrivateIdentifier`).
 */
const plainKey = (n: AstNode): AstNode | undefined => {
  const key = child(n, 'key');
  if (key === undefined || flag(n, 'computed')) return undefined;
  return key.type === 'Identifier' || isLiteralKey(key) ? key : undefined;
};

/** Remove parênteses, caso o parser os preserve: o `typescript-estree` não os representa. */
const unwrap = (node: AstNode | undefined): AstNode | undefined => {
  let cur = node;
  while (
    cur !== undefined &&
    (cur.type === 'ParenthesizedExpression' || cur.type === 'TSParenthesizedType')
  ) {
    cur = child(cur, 'expression') ?? child(cur, 'typeAnnotation');
  }
  return cur;
};

const isFunctionValue = (node: AstNode | undefined): boolean => {
  const v = unwrap(node);
  return v?.type === 'ArrowFunctionExpression' || v?.type === 'FunctionExpression';
};

/** `getIdentifiersFromPattern`: todo identificador que um padrão de desestruturação declara. */
const boundIdentifiers = (node: AstNode | undefined): readonly AstNode[] => {
  if (node === undefined) return [];
  switch (node.type) {
    case 'Identifier':
      return [node];
    case 'ObjectPattern':
      return children(node, 'properties').flatMap((p) =>
        boundIdentifiers(p.type === 'RestElement' ? child(p, 'argument') : child(p, 'value')),
      );
    case 'ArrayPattern':
      return children(node, 'elements').flatMap((el) => boundIdentifiers(el));
    case 'AssignmentPattern':
      return boundIdentifiers(child(node, 'left'));
    case 'RestElement':
      return boundIdentifiers(child(node, 'argument'));
    case 'TSParameterProperty':
      return boundIdentifiers(child(node, 'parameter'));
    default:
      return [];
  }
};

/**
 * Funções cujos PARÂMETROS o plugin valida — exatamente os seletores do plugin:
 * `FunctionDeclaration, TSDeclareFunction, TSEmptyBodyFunctionExpression, FunctionExpression,
 * ArrowFunctionExpression`. Método de objeto, getter, setter e construtor são `FunctionExpression`
 * no ESTree. Assinatura de TIPO (`TSFunctionType`, `TSMethodSignature`) não está na lista —
 * parâmetro de tipo função não é validado.
 */
const PARAM_OWNERS: ReadonlySet<string> = new Set([
  'FunctionDeclaration',
  'TSDeclareFunction',
  'TSEmptyBodyFunctionExpression',
  'FunctionExpression',
  'ArrowFunctionExpression',
]);

const TYPE_LIKE: ReadonlySet<string> = new Set([
  'TSInterfaceDeclaration',
  'TSTypeAliasDeclaration',
  'TSEnumDeclaration',
  'ClassDeclaration',
  'ClassExpression',
]);

type NamingTarget = readonly [selector: keyof typeof NAMING, id: AstNode];

/**
 * Os nomes que um nó DECLARA, cada um com o seletor do plugin que o valida.
 * @param n - Nó qualquer da árvore.
 * @param parent - Pai do nó.
 * @returns Zero ou mais pares seletor/identificador. Parâmetros ficam de fora: são tratados à
 * parte, porque um mesmo nó (uma função nomeada) declara nome E parâmetros.
 */
const namingTargets = (n: AstNode, parent: AstNode | undefined): readonly NamingTarget[] => {
  const at = (selector: keyof typeof NAMING, id: AstNode | undefined): readonly NamingTarget[] =>
    id === undefined ? [] : [[selector, id]];

  switch (n.type) {
    case 'FunctionDeclaration':
    case 'FunctionExpression':
    case 'TSDeclareFunction':
      return at('function', child(n, 'id'));
    case 'VariableDeclarator':
      // `catch (e)` é `CatchClause.param`, não declarator — o plugin não o valida.
      return boundIdentifiers(child(n, 'id')).map((id): NamingTarget => ['variable', id]);
    case 'ImportDefaultSpecifier':
    case 'ImportNamespaceSpecifier':
      return at('import', child(n, 'local'));
    case 'ImportSpecifier': {
      // `import { default as X }` é o único especificador nomeado que o plugin valida.
      const imported = child(n, 'imported');
      const isDefault = imported !== undefined && nameText(imported) === 'default';
      return isDefault ? at('import', child(n, 'local')) : [];
    }
    case 'Property': {
      // `Property` também aparece em `ObjectPattern` (desestruturação) — lá quem declara é o valor.
      if (parent?.type !== 'ObjectExpression' || flag(n, 'shorthand')) return [];
      const kind = text(n, 'kind');
      const isMember =
        flag(n, 'method') || kind === 'get' || kind === 'set' || isFunctionValue(child(n, 'value'));
      return at(isMember ? 'member' : 'objectLiteralProperty', plainKey(n));
    }
    case 'MethodDefinition':
    case 'TSAbstractMethodDefinition':
      return text(n, 'kind') === 'constructor' ? [] : at('member', plainKey(n));
    case 'TSMethodSignature':
      return at('member', plainKey(n));
    case 'TSPropertySignature': {
      const annotation = unwrap(child(child(n, 'typeAnnotation') ?? n, 'typeAnnotation'));
      return at(annotation?.type === 'TSFunctionType' ? 'member' : 'typeProperty', plainKey(n));
    }
    case 'TSTypeParameter':
      // O de `infer` fica fora; o de mapped type nem é `TSTypeParameter` (é `TSMappedType.key`).
      return parent?.type === 'TSInferType' ? [] : at('typeLike', child(n, 'name'));
    case 'TSEnumMember':
      return at('enumMember', child(n, 'id'));
    default:
      return TYPE_LIKE.has(n.type) ? at('typeLike', child(n, 'id')) : [];
  }
};

/**
 * Violações de `naming-convention` na config do projeto.
 * @param file - Arquivo a varrer.
 * @returns Um achado por nome fora do formato do seu seletor.
 */
export const findNaming = (file: ParsedFile): readonly GapFinding[] => {
  const out: GapFinding[] = [];
  const check = (selector: keyof typeof NAMING, id: AstNode): void => {
    const name = nameText(id);
    const requiresQuotes = isLiteralKey(id) && !IDENTIFIER_TEXT.test(name);
    const reason = validateName(name, NAMING[selector] ?? [DEFAULT], requiresQuotes);
    if (reason !== null) {
      out.push({
        rule: 'naming-convention',
        line: file.lineOf(id),
        name,
        detail: `${selector}: ${reason}`,
      });
    }
  };

  walk(file.program, (n, parent) => {
    if (PARAM_OWNERS.has(n.type)) {
      for (const param of children(n, 'params')) {
        for (const id of boundIdentifiers(param)) check('parameter', id);
      }
    }
    for (const [selector, id] of namingTargets(n, parent)) check(selector, id);
  });
  return out;
};
