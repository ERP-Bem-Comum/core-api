/**
 * SOURCE-SCAN — varredura de fonte para testes estruturais (`tests/cleanup/*.test.ts`).
 *
 * Existe por duas razões, ambas medidas neste repositório:
 *
 * 1. **Oito cópias do mesmo `walk()`** espalhadas por `tests/cleanup/`, seis delas criadas num
 *    único dia. Cada gate novo nascia copiando o anterior — inclusive os defeitos do anterior.
 *
 * 2. **A distinção uso × menção, errada seis vezes.** Varrer por NOME de símbolo acusa
 *    comentários, e neste repo o comentário costuma ser justamente quem DOCUMENTA a norma: o
 *    `sweeper/run.ts:4` escreve "SEM AbortController / SIGTERM listener" para ensinar a regra, e
 *    quatro arquivos de domínio escrevem `new Date()` na prosa pelo mesmo motivo. Um padrão
 *    ingênuo reprova o melhor arquivo do conjunto. O inventário de decisões catalogou o caso como
 *    "armadilha nº 6 e nº 7 de grep ingênuo" — duas inversões de veredito de ADR.
 *
 * A API separa `filesContaining` (texto cru — comentário CONTA) de `filesUsing` (só linhas de
 * código) de propósito: os dois nomes forçam quem escreve o gate a decidir conscientemente qual
 * dos dois quer, em vez de herdar a escolha por cópia.
 *
 * Todos os caminhos retornados são **relativos ao PROJECT_ROOT, em formato posix** — é o que
 * produz mensagem de falha legível e asserção estável entre máquinas.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));

/** Raiz do repositório, derivada da posição deste arquivo (`tests/support/`). */
export const PROJECT_ROOT = resolve(HERE, '..', '..');

export type WalkOptions = Readonly<{
  /** Extensão a filtrar, com ponto (ex.: `.ts`). Omitida, devolve todo arquivo. */
  ext?: string;
  /** Nomes de diretório a pular em QUALQUER nível, além de `node_modules` e dot-dirs. */
  excludeDirs?: readonly string[];
  /**
   * Nomes a pular apenas no PRIMEIRO nível de `absDir`.
   *
   * Distinção necessária, não preciosismo: `tests/reports/` são artefatos forenses a ignorar,
   * mas `tests/modules/reports/` é a suíte de um módulo e precisa ser varrida. Excluir por nome
   * em qualquer nível tiraria a segunda junto — regressão de cobertura silenciosa.
   */
  excludeTopLevel?: readonly string[];
}>;

/**
 * Lista recursiva de arquivos sob `absDir`. Pula `node_modules` e diretórios que começam com `.`
 * sempre — varrer `node_modules` num gate é sempre engano, nunca intenção.
 */
export const walkFiles = (absDir: string, options: WalkOptions = {}): readonly string[] => {
  const excluded = new Set(['node_modules', ...(options.excludeDirs ?? [])]);
  const topLevelExcluded = new Set(options.excludeTopLevel ?? []);
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || excluded.has(entry)) continue;
      if (dir === absDir && topLevelExcluded.has(entry)) continue;
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) visit(full);
      else if (st.isFile() && (options.ext === undefined || entry.endsWith(options.ext))) {
        out.push(relative(PROJECT_ROOT, full).split(sep).join('/'));
      }
    }
  };
  visit(absDir);
  return out.sort();
};

/** Conteúdo de um arquivo, dado o caminho relativo ao PROJECT_ROOT. */
export const readSource = (relPath: string): string =>
  readFileSync(join(PROJECT_ROOT, relPath), 'utf-8');

/** Linha de comentário de bloco (` * …`) ou de linha (`// …`). */
export const isCommentLine = (line: string): boolean => {
  const t = line.trimStart();
  return t.startsWith('*') || t.startsWith('//') || t.startsWith('/*');
};

const matches = (line: string, pattern: string | RegExp): boolean =>
  typeof pattern === 'string' ? line.includes(pattern) : pattern.test(line);

/**
 * Arquivos cujo TEXTO CRU casa `pattern` — comentário conta.
 *
 * Use quando a presença do literal é o que importa em si (ex.: proibir uma connection string
 * fixa em qualquer lugar, inclusive numa constante ou num comentário).
 */
export const filesContaining = (
  absDir: string,
  pattern: string | RegExp,
  options: WalkOptions = {},
): readonly string[] => walkFiles(absDir, options).filter((f) => matches(readSource(f), pattern));

/**
 * Arquivos que USAM `pattern` em linha de código — comentário é ignorado.
 *
 * Use para norma sobre o que o código FAZ. O `pattern` ainda deve exigir a forma de uso
 * (`new AbortController(`, `Object.freeze(`, `new Date()`), não o nome solto: ignorar comentário
 * elimina o falso positivo do arquivo que documenta a regra, não o de um nome homônimo.
 */
export const filesUsing = (
  absDir: string,
  pattern: string | RegExp,
  options: WalkOptions = {},
): readonly string[] =>
  walkFiles(absDir, options).filter((f) =>
    readSource(f)
      .split('\n')
      .some((line) => !isCommentLine(line) && matches(line, pattern)),
  );

const IMPORT_SPECIFIER = /from\s+['"]([^'"]+)['"]/g;

/**
 * Specifiers de import de um arquivo — o que vem depois de `from`, nunca texto solto.
 *
 * É o que permite decidir dependência real: um caminho citado em comentário ou numa string de
 * mensagem não é import.
 */
export const importSpecifiers = (relPath: string): readonly string[] => {
  const out: string[] = [];
  for (const m of readSource(relPath).matchAll(IMPORT_SPECIFIER)) {
    const spec = m[1];
    if (spec !== undefined) out.push(spec);
  }
  return out;
};
