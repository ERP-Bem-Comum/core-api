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

const main = (): void => {
  if (existsSync(WIKI_DIR)) {
    process.stdout.write(`atualizando ${WIKI_DIR}\n`);
    run(WIKI_DIR, 'pull', '--ff-only');
    process.stdout.write('wiki atualizada\n');
    return;
  }

  process.stdout.write(`clonando a wiki em ${WIKI_DIR}\n`);
  try {
    run(PROJECT_ROOT, 'clone', WIKI_REMOTE, '.wiki');
    process.stdout.write('wiki clonada — o Claude já a lê por Read/Grep/Glob\n');
  } catch {
    // `Repository not found` na wiki quase nunca é permissão: é a wiki nunca ter sido inicializada.
    // O repo `.wiki.git` só passa a existir depois que a PRIMEIRA página é criada pela interface web.
    process.stderr.write(
      'wiki não encontrada.\n\n' +
        'A wiki está habilitada no repositório, mas o repo `.wiki.git` só nasce depois que a\n' +
        'primeira página é criada pela interface web — não há API nem comando `gh` que a crie.\n\n' +
        'Crie uma página em https://github.com/ERP-Bem-Comum/core-api/wiki e rode de novo.\n',
    );
    process.exitCode = 1;
  }
};

main();
