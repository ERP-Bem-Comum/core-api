/**
 * OXC-AST — ponto ÚNICO de acesso ao parser nos testes estruturais.
 *
 * Substitui a API `typescript/unstable/*` do TS 7, que conversa com o binário Go por um pipe e lê o
 * descritor de arquivo de um campo PRIVADO do Node (`stdout._handle.fd`). Fora do Node — no Bun —
 * esse campo não existe e o gate quebrava antes da primeira asserção. O `oxc-parser` é nativo
 * (N-API), síncrono e não depende do runtime.
 *
 * A AST devolvida é ESTree com as extensões do `typescript-estree` — a MESMA família de árvore sobre
 * a qual o `@typescript-eslint/eslint-plugin` foi escrito. As regras de `lint-gaps.ts` portam aquele
 * plugin; ler ESTree deixa o porte mais literal do que era sobre a AST do compilador.
 *
 * ⚠️ O `oxc-parser` é fixado em versão EXATA no manifesto: a forma da árvore é a superfície de que
 * os gates dependem, e uma faixa deixaria a resolução trocá-la sem decisão.
 */

import { parseSync } from 'oxc-parser';

/** Nó mínimo: o que toda árvore ESTree garante. O resto se lê pelos acessores abaixo. */
export type AstNode = Readonly<{ type: string; start: number; end: number }>;

/** Um arquivo analisado: a árvore, os erros de sintaxe e a conversão de offset em linha. */
export type ParsedFile = Readonly<{
  fileName: string;
  program: AstNode;
  errors: readonly string[];
  lineOf: (node: AstNode) => number;
}>;

/**
 * Início (offset UTF-16) de cada linha. O `oxc-parser` devolve `start`/`end` em UTF-16 — o mesmo
 * índice de `String` do JS —, então acento antes do nó não desloca a linha.
 */
const lineStarts = (source: string): readonly number[] => {
  const starts = [0];
  for (let i = 0; i < source.length; i += 1) {
    if (source.charCodeAt(i) === 10) starts.push(i + 1);
  }
  return starts;
};

/** Busca binária: a maior linha cujo início é `<= offset`. */
const lineAt = (starts: readonly number[], offset: number): number => {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if ((starts[mid] ?? 0) <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
};

/**
 * Analisa um arquivo TypeScript.
 * @param fileName - Nome (decide `.d.ts` × `.ts`); não é lido do disco.
 * @param source - Conteúdo do arquivo.
 * @returns Árvore, erros e `lineOf` (1-based, como o editor reporta).
 * @remarks
 * `preserveParens: false` reproduz o `typescript-estree`, que não representa parênteses — o plugin
 * portado nunca os viu, e `(() => void)` tem de chegar à regra como o tipo função de dentro.
 */
export const parseTs = (fileName: string, source: string): ParsedFile => {
  const result = parseSync(fileName, source, {
    lang: fileName.endsWith('.d.ts') ? 'dts' : 'ts',
    sourceType: 'module',
    preserveParens: false,
  });
  const starts = lineStarts(source);
  return {
    fileName,
    program: result.program,
    errors: result.errors.map((e) => e.message),
    lineOf: (node) => lineAt(starts, node.start),
  };
};

const isNode = (x: unknown): x is AstNode =>
  typeof x === 'object' && x !== null && typeof (x as { type?: unknown }).type === 'string';

const raw = (node: AstNode, key: string): unknown =>
  (node as Readonly<Record<string, unknown>>)[key];

/** Filho único em `key`, ou `undefined` se ausente, `null` ou não-nó. */
export const child = (node: AstNode, key: string): AstNode | undefined => {
  const v = raw(node, key);
  return isNode(v) ? v : undefined;
};

/** Filhos em lista em `key` (buracos de `[a, , b]` ficam de fora). */
export const children = (node: AstNode, key: string): readonly AstNode[] => {
  const v = raw(node, key);
  return Array.isArray(v) ? v.filter(isNode) : [];
};

/** Propriedade booleana em `key` — `true` só quando é literalmente `true`. */
export const flag = (node: AstNode, key: string): boolean => raw(node, key) === true;

/** Propriedade textual em `key` (`Identifier.name`, `kind` de método). */
export const text = (node: AstNode, key: string): string | undefined => {
  const v = raw(node, key);
  return typeof v === 'string' ? v : undefined;
};

/** Valor primitivo de um `Literal` (string ou número); `undefined` para qualquer outro nó. */
export const literalValue = (node: AstNode): string | number | undefined => {
  if (node.type !== 'Literal') return undefined;
  const v = raw(node, 'value');
  return typeof v === 'string' || typeof v === 'number' ? v : undefined;
};

/**
 * Pré-ordem sobre a árvore inteira, entregando o pai de cada nó.
 * @remarks
 * Genérico por desenho: enumera toda propriedade que contém nó, em vez de uma tabela de chaves por
 * tipo. Uma tabela esquecida faria a regra não ver uma subárvore — e o gate ficaria verde por ela.
 */
export const walk = (
  node: AstNode,
  visit: (n: AstNode, parent: AstNode | undefined) => void,
  parent?: AstNode,
): void => {
  visit(node, parent);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) {
      for (const item of value) if (isNode(item)) walk(item, visit, node);
    } else if (isNode(value)) {
      walk(value, visit, node);
    }
  }
};
