import { join } from 'node:path';

import { SyntaxKind, createScanner, getTokenPosOfNode, withSourceFiles } from './ts-ast.ts';
import type { Node, SourceFile } from './ts-ast.ts';

/** Identificador kebab-case de cada violação que o scanner acusa. */
export type CommentRule =
  | 'line-comment'
  | 'block-comment'
  | 'loose-tsdoc'
  | 'tag-not-allowed'
  | 'example-repeated'
  | 'param-unknown'
  | 'param-missing'
  | 'type-param-unknown'
  | 'type-param-missing'
  | 'directive-not-allowed'
  | 'see-target-not-allowed';

/** Uma violação: a regra, a linha (1-based) e a mensagem. */
export type CommentFinding = Readonly<{
  rule: CommentRule;
  line: number;
  detail: string;
}>;

/** Uma violação com o caminho do arquivo onde ela está. */
export type LocatedCommentFinding = CommentFinding & Readonly<{ file: string }>;

/** `'tests'` aceita `// @ts-expect-error`; `'source'` não aceita. */
export type CommentScope = 'source' | 'tests';

type NodeView = Node &
  Readonly<{
    name?: Node;
    text?: string;
    parameters?: readonly Node[];
    typeParameters?: readonly Node[];
    body?: Node;
    type?: Node;
    initializer?: Node;
    expression?: Node;
    declarationList?: Node;
    declarations?: readonly Node[];
    modifiers?: readonly Node[];
  }>;

const view = (node: Node): NodeView => node as NodeView;

type Lexeme = Readonly<{ kind: SyntaxKind; pos: number; end: number }>;

type DocumentedName = Readonly<{ name: string; line: number }>;

type Signature = Readonly<{ params: readonly Node[]; typeParams: readonly Node[] }>;

const ALLOWED_TAGS: ReadonlySet<string> = new Set([
  'param',
  'typeParam',
  'returns',
  'example',
  'defaultValue',
  'deprecated',
  'see',
  'throws',
]);

const ALLOWED_TAG_LIST = [...ALLOWED_TAGS].map((t) => `@${t}`).join(', ');

const SEE_TARGET = /^(?:\{@link\s+[^}\s]+\}|tests\/[\w./-]+\.test\.ts)(?:\s|$)/;

/**
 * Caminho de arquivo de teste citado por `@see` num texto: `tests/...test.ts` logo após a tag.
 *
 * @param text - Texto do arquivo-fonte.
 * @returns Os caminhos citados, na ordem do texto, com repetição.
 */
export const citedTestPaths = (text: string): readonly string[] =>
  [...text.matchAll(/@see\s+(tests\/[\w./-]+\.test\.ts)/g)].map((m) => m[1] ?? '');

const DIRECTIVE_SHAPE =
  /^(?:@ts-|(?:es|ox|ts)lint[-:]|prettier-ignore|istanbul\s|c8\s|v8\s|#(?:end)?region\b|global\s|jshint|biome-ignore|deno-)/;

const DISABLE_NEXT_LINE = /^(?:oxlint|eslint)-disable-next-line\s+(\S.*)$/;

const ALLOWED_DIRECTIVE_RULE =
  /^(?:[\w@-]+\/)*(?:no-explicit-any|no-non-null-assertion|no-unsafe-[a-z]+(?:-[a-z]+)*)$/;

const TRIPLE_SLASH_REFERENCE = /^\/\/\/\s*<reference\s[^>]*\/>\s*$/;

const COMMENT_KINDS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.SingleLineCommentTrivia,
  SyntaxKind.MultiLineCommentTrivia,
]);

const TOP_LEVEL_DECLARATIONS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.VariableStatement,
  SyntaxKind.TypeAliasDeclaration,
  SyntaxKind.InterfaceDeclaration,
]);

const TYPE_MEMBERS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.PropertySignature,
  SyntaxKind.MethodSignature,
  SyntaxKind.CallSignature,
  SyntaxKind.ConstructSignature,
  SyntaxKind.IndexSignature,
]);

const OBJECT_MEMBERS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.PropertyAssignment,
  SyntaxKind.ShorthandPropertyAssignment,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
]);

const PATH_FROM_OBJECT_TO_DECLARATION: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.ObjectLiteralExpression,
  SyntaxKind.PropertyAssignment,
  SyntaxKind.ArrayLiteralExpression,
  SyntaxKind.ParenthesizedExpression,
  SyntaxKind.AsExpression,
  SyntaxKind.SatisfiesExpression,
  SyntaxKind.CallExpression,
]);

const FUNCTION_LIKE: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.FunctionExpression,
  SyntaxKind.ArrowFunction,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.GetAccessor,
  SyntaxKind.SetAccessor,
  SyntaxKind.Constructor,
]);

const SIGNATURE_OWNERS: ReadonlySet<SyntaxKind> = new Set([
  ...FUNCTION_LIKE,
  SyntaxKind.MethodSignature,
  SyntaxKind.CallSignature,
  SyntaxKind.ConstructSignature,
  SyntaxKind.IndexSignature,
  SyntaxKind.FunctionType,
  SyntaxKind.ConstructorType,
]);

const VALUE_WRAPPERS: ReadonlySet<SyntaxKind> = new Set([
  SyntaxKind.ParenthesizedExpression,
  SyntaxKind.AsExpression,
  SyntaxKind.SatisfiesExpression,
]);

const NO_SIGNATURE: Signature = { params: [], typeParams: [] };

const walk = (node: Node, visit: (n: Node) => void): void => {
  visit(node);
  node.forEachChild((child) => {
    walk(child, visit);
    return undefined;
  });
};

const kindName = (kind: SyntaxKind): string => SyntaxKind[kind];

const lineAt = (sf: SourceFile, pos: number): number =>
  sf.getLineAndCharacterOfPosition(pos).line + 1;

const startsItsLine = (sf: SourceFile, pos: number): boolean => {
  const { character } = sf.getLineAndCharacterOfPosition(pos);
  return sf.text.slice(pos - character, pos).trim() === '';
};

const lexemesOf = (sf: SourceFile): readonly Lexeme[] => {
  const regexStarts = new Set<number>();
  const templateContinuationStarts = new Set<number>();
  walk(sf, (n) => {
    if (n.kind === SyntaxKind.RegularExpressionLiteral) {
      regexStarts.add(getTokenPosOfNode(n, sf));
    } else if (n.kind === SyntaxKind.TemplateMiddle || n.kind === SyntaxKind.TemplateTail) {
      templateContinuationStarts.add(getTokenPosOfNode(n, sf));
    }
  });
  const scanner = createScanner(false, sf.languageVariant, sf.text);
  const out: Lexeme[] = [];
  const rescanned = (kind: SyntaxKind, start: number): SyntaxKind => {
    const isSlash = kind === SyntaxKind.SlashToken || kind === SyntaxKind.SlashEqualsToken;
    if (isSlash && regexStarts.has(start)) return scanner.reScanSlashToken();
    if (kind === SyntaxKind.CloseBraceToken && templateContinuationStarts.has(start)) {
      return scanner.reScanTemplateToken(false);
    }
    return kind;
  };
  for (let kind = scanner.scan(); kind !== SyntaxKind.EndOfFile; kind = scanner.scan()) {
    const start = scanner.getTokenStart();
    out.push({ kind: rescanned(kind, start), pos: start, end: scanner.getTokenEnd() });
  }
  return out;
};

const outermostNodeByTokenStart = (sf: SourceFile): ReadonlyMap<number, Node> => {
  const out = new Map<number, Node>();
  walk(sf, (n) => {
    if (n.kind === SyntaxKind.SourceFile) return;
    const start = getTokenPosOfNode(n, sf);
    if (!out.has(start)) out.set(start, n);
  });
  return out;
};

const isTsdoc = (text: string): boolean => text.startsWith('/**') && text !== '/**/';

const isAllowedDisableDirective = (body: string): boolean => {
  const match = DISABLE_NEXT_LINE.exec(body);
  const ruleList = match?.[1];
  if (ruleList === undefined || ruleList.includes('--')) return false;
  return ruleList.split(',').every((rule) => ALLOWED_DIRECTIVE_RULE.test(rule.trim()));
};

const isAllowedLineComment = (text: string, scope: CommentScope): boolean => {
  if (TRIPLE_SLASH_REFERENCE.test(text)) return true;
  const body = text.slice(2).trim();
  if (body === '@ts-expect-error') return scope === 'tests';
  return isAllowedDisableDirective(body);
};

const looksLikeDirective = (text: string): boolean => {
  const body = text.startsWith('/*') ? text.slice(2, -2).trim() : text.slice(2).trim();
  return DIRECTIVE_SHAPE.test(body);
};

const directiveFinding = (text: string, line: number): CommentFinding => ({
  rule: 'directive-not-allowed',
  line,
  detail:
    `diretiva \`${text.trim()}\` fora do conjunto permitido: só ` +
    '`oxlint-disable-next-line`/`eslint-disable-next-line` de `no-explicit-any`, `no-unsafe-*` ou ' +
    '`no-non-null-assertion`, sem descrição, e `// @ts-expect-error` puro em tests/',
});

const plainCommentFinding = (rule: CommentRule, line: number): CommentFinding => ({
  rule,
  line,
  detail:
    `comentário ${rule === 'line-comment' ? '`//`' : '`/* */`'} proibido: o conserto é nome, ` +
    'extração de função ou tipo; documentação é TSDoc colado acima da declaração',
});

const looseFinding = (line: number, reason: string): CommentFinding => ({
  rule: 'loose-tsdoc',
  line,
  detail: `TSDoc solto: ${reason}`,
});

const isModuleLevel = (node: Node): boolean =>
  node.parent?.kind === SyntaxKind.SourceFile || node.parent?.kind === SyntaxKind.ModuleBlock;

const isExported = (node: Node): boolean =>
  (view(node).modifiers ?? []).some((m) => m.kind === SyntaxKind.ExportKeyword);

const isInsideFunctionBody = (node: Node, tokenStart: number): boolean => {
  for (let cur = node.parent as Node | undefined; cur !== undefined; cur = cur.parent) {
    const body = FUNCTION_LIKE.has(cur.kind) ? view(cur).body : undefined;
    if (body !== undefined && tokenStart >= body.pos && tokenStart < body.end) return true;
  }
  return false;
};

const isExportedObjectMember = (node: Node): boolean => {
  for (let cur = node.parent as Node | undefined; cur !== undefined; cur = cur.parent) {
    if (cur.kind === SyntaxKind.VariableDeclaration) {
      const statement = cur.parent?.parent;
      return (
        statement?.kind === SyntaxKind.VariableStatement &&
        isModuleLevel(statement) &&
        isExported(statement)
      );
    }
    if (!PATH_FROM_OBJECT_TO_DECLARATION.has(cur.kind)) return false;
  }
  return false;
};

const placementProblem = (node: Node, tokenStart: number): string | null => {
  if (isInsideFunctionBody(node, tokenStart)) return 'está dentro do corpo de uma função';
  if (TOP_LEVEL_DECLARATIONS.has(node.kind)) {
    return isModuleLevel(node)
      ? null
      : `precede \`${kindName(node.kind)}\` fora do nível do módulo`;
  }
  if (TYPE_MEMBERS.has(node.kind)) return null;
  if (OBJECT_MEMBERS.has(node.kind)) {
    return isExportedObjectMember(node)
      ? null
      : 'precede propriedade de objeto que não é o valor de um `const`/`let` exportado';
  }
  return `precede \`${kindName(node.kind)}\`, que não é declaração documentável`;
};

const unwrapValue = (node: Node | undefined): Node | undefined => {
  let cur = node;
  while (cur !== undefined && VALUE_WRAPPERS.has(cur.kind)) cur = view(cur).expression;
  return cur;
};

const unwrapType = (node: Node | undefined): Node | undefined => {
  let cur = node;
  while (cur?.kind === SyntaxKind.ParenthesizedType) cur = view(cur).type;
  return cur;
};

const ownSignature = (node: Node | undefined): Signature | null =>
  node !== undefined && SIGNATURE_OWNERS.has(node.kind)
    ? { params: view(node).parameters ?? [], typeParams: view(node).typeParameters ?? [] }
    : null;

const singleDeclarationInitializer = (statement: Node): Node | undefined => {
  const list = view(statement).declarationList;
  const declarations = list === undefined ? [] : (view(list).declarations ?? []);
  const [only, ...rest] = declarations;
  return only !== undefined && rest.length === 0 ? view(only).initializer : undefined;
};

const signatureOf = (node: Node): Signature => {
  const v = view(node);
  if (node.kind === SyntaxKind.VariableStatement) {
    return ownSignature(unwrapValue(singleDeclarationInitializer(node))) ?? NO_SIGNATURE;
  }
  if (node.kind === SyntaxKind.PropertyAssignment) {
    return ownSignature(unwrapValue(v.initializer)) ?? NO_SIGNATURE;
  }
  if (node.kind === SyntaxKind.PropertySignature) {
    return ownSignature(unwrapType(v.type)) ?? NO_SIGNATURE;
  }
  if (
    node.kind === SyntaxKind.TypeAliasDeclaration ||
    node.kind === SyntaxKind.InterfaceDeclaration
  ) {
    const inner = ownSignature(unwrapType(v.type)) ?? NO_SIGNATURE;
    return { params: inner.params, typeParams: [...(v.typeParameters ?? []), ...inner.typeParams] };
  }
  return ownSignature(node) ?? NO_SIGNATURE;
};

const identifierSlots = (nodes: readonly Node[]): readonly (string | null)[] =>
  nodes
    .map((n) => view(n).name)
    .filter((name) => !(name?.kind === SyntaxKind.Identifier && view(name).text === 'this'))
    .map((name) => (name?.kind === SyntaxKind.Identifier ? (view(name).text ?? null) : null));

const tsdocBodyLines = (text: string): readonly string[] =>
  text
    .slice(3, -2)
    .split('\n')
    .map((l) => l.replace(/\r$/, '').replace(/^\s*\*?\s?/, ''));

const documentedName = (rest: string): string => {
  const afterType = rest.startsWith('{') ? rest.slice(rest.indexOf('}') + 1).trim() : rest;
  const match = /^\[?([\w$]+)/.exec(afterType);
  return match?.[1] ?? '';
};

const nameFindings = (
  documented: readonly DocumentedName[],
  slots: readonly (string | null)[],
  rules: Readonly<{ unknown: CommentRule; missing: CommentRule; tag: string }>,
  docLine: number,
): readonly CommentFinding[] => {
  const out: CommentFinding[] = [];
  const named = new Set(slots.filter((s): s is string => s !== null));
  const unnamedCount = slots.filter((s) => s === null).length;
  const seen = new Set<string>();
  let unnamedUsed = 0;
  for (const d of documented) {
    if (seen.has(d.name)) continue;
    seen.add(d.name);
    if (named.has(d.name)) continue;
    if (unnamedUsed < unnamedCount) {
      unnamedUsed += 1;
      continue;
    }
    out.push({
      rule: rules.unknown,
      line: d.line,
      detail: `\`@${rules.tag} ${d.name}\` não existe na assinatura`,
    });
  }
  if (documented.length === 0) return out;
  for (const name of named) {
    if (!seen.has(name)) {
      out.push({
        rule: rules.missing,
        line: docLine,
        detail: `\`${name}\` sem \`@${rules.tag}\` num TSDoc que documenta os demais`,
      });
    }
  }
  if (unnamedUsed < unnamedCount) {
    out.push({
      rule: rules.missing,
      line: docLine,
      detail: `parâmetro desestruturado sem \`@${rules.tag}\` num TSDoc que documenta os demais`,
    });
  }
  return out;
};

const tagFindings = (
  text: string,
  docLine: number,
  declaration: Node,
): readonly CommentFinding[] => {
  const out: CommentFinding[] = [];
  const params: DocumentedName[] = [];
  const typeParams: DocumentedName[] = [];
  let examples = 0;
  let insideFence = false;
  tsdocBodyLines(text).forEach((raw, index) => {
    const content = raw.trim();
    const line = docLine + index;
    if (content.startsWith('```')) insideFence = !insideFence;
    const tag = insideFence ? undefined : /^@(\w+)/.exec(content)?.[1];
    if (tag === undefined) return;
    const rest = content.slice(tag.length + 1).trim();
    if (!ALLOWED_TAGS.has(tag)) {
      out.push({
        rule: 'tag-not-allowed',
        line,
        detail: `tag \`@${tag}\` fora da lista permitida (${ALLOWED_TAG_LIST})`,
      });
    } else if (tag === 'example') {
      examples += 1;
      if (examples > 1) {
        out.push({
          rule: 'example-repeated',
          line,
          detail: 'mais de um `@example` no mesmo TSDoc',
        });
      }
    } else if (tag === 'see' && !SEE_TARGET.test(rest)) {
      out.push({
        rule: 'see-target-not-allowed',
        line,
        detail:
          '`@see` aponta só para `{@link Simbolo}` do código ou para o caminho de um ' +
          '`tests/**/*.test.ts` que prova a frase',
      });
    } else if (tag === 'param') {
      params.push({ name: documentedName(rest), line });
    } else if (tag === 'typeParam') {
      typeParams.push({ name: documentedName(rest), line });
    }
  });
  const signature = signatureOf(declaration);
  return [
    ...out,
    ...nameFindings(
      params,
      identifierSlots(signature.params),
      { unknown: 'param-unknown', missing: 'param-missing', tag: 'param' },
      docLine,
    ),
    ...nameFindings(
      typeParams,
      identifierSlots(signature.typeParams),
      { unknown: 'type-param-unknown', missing: 'type-param-missing', tag: 'typeParam' },
      docLine,
    ),
  ];
};

const followingCodeStart = (
  lexemes: readonly Lexeme[],
  from: number,
  text: string,
  scope: CommentScope,
): Readonly<{ start: number } | { problem: string }> => {
  let newlines = 0;
  for (let i = from; i < lexemes.length; i += 1) {
    const lexeme = lexemes[i];
    if (lexeme === undefined) break;
    if (lexeme.kind === SyntaxKind.NewLineTrivia) {
      newlines += 1;
      if (newlines > 1) return { problem: 'há linha em branco entre ele e a declaração' };
    } else if (COMMENT_KINDS.has(lexeme.kind)) {
      const commentText = text.slice(lexeme.pos, lexeme.end);
      const transparent =
        lexeme.kind === SyntaxKind.SingleLineCommentTrivia &&
        isAllowedLineComment(commentText, scope);
      if (!transparent) return { problem: 'há outro comentário entre ele e a declaração' };
      newlines = 0;
    } else if (lexeme.kind !== SyntaxKind.WhitespaceTrivia) {
      return { start: lexeme.pos };
    }
  }
  return { problem: 'não há declaração depois dele' };
};

const tsdocFindings = (
  sf: SourceFile,
  lexemes: readonly Lexeme[],
  index: number,
  context: Readonly<{ scope: CommentScope; nodes: ReadonlyMap<number, Node> }>,
): readonly CommentFinding[] => {
  const comment = lexemes[index];
  if (comment === undefined) return [];
  const text = sf.text.slice(comment.pos, comment.end);
  const line = lineAt(sf, comment.pos);
  if (!startsItsLine(sf, comment.pos)) return [looseFinding(line, 'está no fim de uma linha')];
  const next = followingCodeStart(lexemes, index + 1, sf.text, context.scope);
  if ('problem' in next) return [looseFinding(line, next.problem)];
  const declaration = context.nodes.get(next.start);
  if (declaration === undefined) return [looseFinding(line, 'não precede nenhum nó')];
  const problem = placementProblem(declaration, next.start);
  if (problem !== null) return [looseFinding(line, problem)];
  return tagFindings(text, line, declaration);
};

const commentFindings = (
  sf: SourceFile,
  lexemes: readonly Lexeme[],
  index: number,
  context: Readonly<{ scope: CommentScope; nodes: ReadonlyMap<number, Node> }>,
): readonly CommentFinding[] => {
  const lexeme = lexemes[index];
  if (lexeme === undefined || !COMMENT_KINDS.has(lexeme.kind)) return [];
  const text = sf.text.slice(lexeme.pos, lexeme.end);
  const line = lineAt(sf, lexeme.pos);
  if (lexeme.kind === SyntaxKind.SingleLineCommentTrivia) {
    if (isAllowedLineComment(text, context.scope)) return [];
    if (looksLikeDirective(text)) return [directiveFinding(text, line)];
    return [plainCommentFinding('line-comment', line)];
  }
  if (isTsdoc(text)) return tsdocFindings(sf, lexemes, index, context);
  if (looksLikeDirective(text)) return [directiveFinding(text, line)];
  return [plainCommentFinding('block-comment', line)];
};

/**
 * Violações da regra de comentários num arquivo, na ordem em que aparecem.
 * @param sf - Arquivo entregue pelo compilador.
 * @param scope - Escopo do arquivo, que decide se `// @ts-expect-error` é aceito.
 * @returns Lista vazia quando o arquivo segue a regra.
 */
export const scanComments = (sf: SourceFile, scope: CommentScope): readonly CommentFinding[] => {
  const lexemes = lexemesOf(sf);
  const context = { scope, nodes: outermostNodeByTokenStart(sf) };
  return lexemes.flatMap((_, index) => commentFindings(sf, lexemes, index, context));
};

/**
 * Escopo de um caminho relativo à raiz do repositório.
 * @param relPath - Caminho em formato posix.
 * @returns `'tests'` para caminho sob `tests/`; `'source'` para qualquer outro.
 */
export const scopeOf = (relPath: string): CommentScope =>
  relPath.startsWith('tests/') ? 'tests' : 'source';

/**
 * Varre arquivos dados por caminho relativo a `root`.
 * @param root - Diretório absoluto ao qual os caminhos são relativos.
 * @param relPaths - Caminhos dos arquivos a varrer.
 * @returns As violações, cada uma com o caminho relativo; e, em `unparsed`, os caminhos que o
 * compilador não entregou.
 */
export const scanPaths = (
  root: string,
  relPaths: readonly string[],
): Readonly<{ findings: readonly LocatedCommentFinding[]; unparsed: readonly string[] }> =>
  withSourceFiles(
    relPaths.map((p) => join(root, p)),
    (files) => {
      const findings: LocatedCommentFinding[] = [];
      const unparsed: string[] = [];
      for (const file of relPaths) {
        const sf = files.get(join(root, file));
        if (sf === undefined) {
          unparsed.push(file);
          continue;
        }
        for (const f of scanComments(sf, scopeOf(file))) findings.push({ ...f, file });
      }
      return { findings, unparsed };
    },
  );

/**
 * Linha de relatório de uma violação.
 * @param finding - A violação.
 * @returns `arquivo:linha: [regra] mensagem`.
 */
export const formatFinding = (finding: LocatedCommentFinding): string =>
  `${finding.file}:${String(finding.line)}: [${finding.rule}] ${finding.detail}`;
