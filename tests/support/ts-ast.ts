/**
 * TS-AST — ponto ÚNICO de acesso à API do compilador TypeScript 7 nos testes estruturais.
 *
 * A API é `unstable/` por declaração do próprio pacote: o TS 7.0 não publica API programática
 * estável (ela é prevista para o 7.1). Concentrar o import aqui faz de um upgrade que mude a
 * superfície uma edição neste arquivo, não uma caça por N gates.
 *
 * ⚠️ O `typescript` é fixado em versão EXATA no manifesto por causa desta API: uma faixa deixaria
 * a resolução trocar a superfície `unstable/` sem que ninguém decidisse.
 *
 * A API conversa com um servidor Go por IPC. Ela é aberta e fechada dentro de `withProject`, e o
 * trabalho sobre a AST acontece DENTRO do callback: o nó não é garantido depois do `close()`.
 */

import { dirname } from 'node:path';

import { getTokenPosOfNode } from 'typescript/unstable/ast';
import type { Node, SourceFile } from 'typescript/unstable/ast';
import { API } from 'typescript/unstable/sync';

export { SyntaxKind } from 'typescript/unstable/ast';
export type { Node, SourceFile } from 'typescript/unstable/ast';

/**
 * Abre o projeto de um `tsconfig.json`, entrega as `SourceFile` selecionadas e fecha a API.
 * @param tsconfigPath - Caminho absoluto do `tsconfig.json`.
 * @param select - Filtro sobre o caminho absoluto de cada arquivo do programa.
 * @param use - Trabalho sobre a AST; roda com a API aberta.
 * @returns O que `use` devolver.
 * @remarks
 * Falha ruidosamente se o projeto não abrir: um gate que recebe zero arquivos fica verde por
 * vacuidade, e é esse o desfecho que este helper existe para impedir.
 */
export const withProject = <R>(
  tsconfigPath: string,
  select: (absPath: string) => boolean,
  use: (files: readonly SourceFile[]) => R,
): R => {
  const api = new API({ cwd: dirname(tsconfigPath) });
  try {
    const snapshot = api.updateSnapshot({ openProjects: [tsconfigPath] });
    const project = snapshot.getProjects()[0];
    if (project === undefined) {
      throw new Error(`a API do TypeScript não abriu o projeto ${tsconfigPath}`);
    }
    const files = project.program
      .getSourceFileNames()
      .filter(select)
      .map((name) => project.program.getSourceFile(name))
      .filter((sf): sf is SourceFile => sf !== undefined);
    return use(files);
  } finally {
    api.close();
  }
};

/**
 * Linha (1-based) onde o nó começa, sem a trivia que o precede.
 * @param sf - Arquivo que contém o nó.
 * @param node - Nó cuja linha se quer.
 * @returns Número da linha, no formato que o editor e o ESLint reportam.
 */
export const lineOf = (sf: SourceFile, node: Node): number =>
  sf.getLineAndCharacterOfPosition(getTokenPosOfNode(node, sf)).line + 1;
