/**
 * WIKI-SYNC — traz a wiki do GitHub para dentro do disco, onde o Claude Code consegue lê-la.
 *
 * A wiki de um repositório vive num repo git SEPARADO (`<repo>.wiki.git`). Isso significa que ela
 * NÃO está no working dir: `Read`, `Grep` e `Glob` não a alcançam, as rules não carregam sobre ela,
 * e nenhum gate a verifica. Uma wiki não-clonada é conhecimento que ninguém lê — exatamente o que
 * este repositório acabou de gastar uma auditoria inteira para eliminar do `handbook/`.
 *
 * Este script fecha essa distância: clona (ou atualiza) a wiki em `.wiki/`, que está no `.gitignore`
 * do repo principal. Depois disso a wiki é lida como qualquer arquivo do projeto.
 *
 * ⚠️ A wiki NÃO é fonte de verdade e não entra no gate. O código é a verdade sobre o que existe; o
 * ADR aceito, sobre o que foi decidido. A wiki é para o que não é nenhum dos dois — conhecimento
 * geral, guia de onboarding, receita de ambiente. Nada que uma rule ou um ADR deva dizer vai para lá.
 *
 * Uso:  pnpm run wiki:sync
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..', '..');
const WIKI_DIR = resolve(PROJECT_ROOT, '.wiki');
const WIKI_REMOTE = 'https://github.com/ERP-Bem-Comum/core-api.wiki.git';

const run = (cwd: string, ...args: readonly string[]): string =>
  execFileSync('git', [...args], { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });

const stderrOf = (e: unknown): string => {
  const err = e as { stderr?: unknown; message?: unknown };
  return String(err.stderr ?? err.message ?? e);
};

/**
 * ⚠️ Um `catch` nu classificaria TODO erro como "wiki não inicializada" — falha de rede, 403 de
 * permissão e proxy corporativo viriam com a mesma mensagem, mandando o usuário criar uma página que
 * já existe. Diagnóstico errado com autoridade é pior que erro cru: manda consertar o que não quebrou.
 */
const main = (): void => {
  if (existsSync(WIKI_DIR)) {
    process.stdout.write(`atualizando ${WIKI_DIR}\n`);
    try {
      run(WIKI_DIR, 'pull', '--ff-only');
      process.stdout.write('wiki atualizada\n');
    } catch (e) {
      // Um `.wiki/` que existe mas não é repo git (clone interrompido, cópia manual) fazia o script
      // morrer com stack trace cru — o `pull` estava fora de qualquer catch.
      process.stderr.write(
        `não consegui atualizar ${WIKI_DIR}:\n${stderrOf(e)}\n\n` +
          'Se o diretório não for um clone válido, apague-o e rode de novo para clonar do zero.\n',
      );
      process.exitCode = 1;
    }
    return;
  }

  process.stdout.write(`clonando a wiki em ${WIKI_DIR}\n`);
  try {
    run(PROJECT_ROOT, 'clone', WIKI_REMOTE, '.wiki');
    process.stdout.write('wiki clonada — o Claude já a lê por Read/Grep/Glob\n');
  } catch (e) {
    const stderr = stderrOf(e);
    // `Repository not found` na wiki quase nunca é permissão: é a wiki nunca ter sido inicializada.
    // O repo `.wiki.git` só passa a existir depois que a PRIMEIRA página é criada pela interface web.
    if (/not found|não encontrado/iu.test(stderr)) {
      process.stderr.write(
        'wiki não encontrada.\n\n' +
          'A wiki está habilitada no repositório, mas o repo `.wiki.git` só nasce depois que a\n' +
          'primeira página é criada pela interface web — não há API nem comando `gh` que a crie.\n\n' +
          'Crie uma página em https://github.com/ERP-Bem-Comum/core-api/wiki e rode de novo.\n',
      );
    } else {
      process.stderr.write(`falha ao clonar a wiki:\n${stderr}\n`);
    }
    process.exitCode = 1;
  }
};

main();
