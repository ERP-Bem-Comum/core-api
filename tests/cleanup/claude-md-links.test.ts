/**
 * CLAUDE-MD-LINKS — todo caminho que a doc canônica cita existe.
 *
 * O `CLAUDE.md` é o único documento que carrega em TODA sessão de agente. Um link para caminho
 * inexistente ali é a forma mais barata de fazer um agente procurar no lugar errado — e o
 * histórico deste repositório mostra que acontece: o `AGENTS.md` que este arquivo substituiu
 * citava `.claude/output-styles/erp-contracts.md` e `handbook/domain/`, nenhum dos dois existente.
 *
 * A própria PROPOSTA de substituição (`context/CLAUDE-md-proposta.md`) nasceu com três caminhos
 * mortos — `.claude/runbooks/claude-code-cheatsheet.md` (o real é `context/runbooks/`),
 * `context/playbooks/` e `handbook/domain/`. Trocar um documento não-verificado por outro
 * não-verificado só reinicia o relógio; este gate é o que impede a reincidência.
 *
 * Escopo: links markdown relativos — `[texto](./caminho)`. URLs e âncoras puras (`#secao`) ficam
 * de fora; a âncora é validada pelo leitor, não pelo filesystem.
 *
 * ⚠️ A pergunta é "existe no REPOSITÓRIO", não "existe neste disco". A primeira versão usava
 * `existsSync` e passava na minha máquina enquanto falhava no CI: o `CLAUDE.md` cita
 * `handbook/guidelines/`, que está no `.gitignore` (PDFs Bradesco, restrição de redistribuição) e
 * portanto NÃO chega num clone limpo. Material local-only citado de propósito não é link morto — o
 * próprio `CLAUDE.md` explica que ele não é versionado. Link morto é caminho que não está no
 * repositório NEM foi deliberadamente excluído dele.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');

// `[texto](./algum/caminho)` — só relativos iniciados por `./`, que é a convenção do arquivo.
const RELATIVE_LINK = /\]\((\.\/[^)\s#]+)/g;

const linkedPaths = (): readonly string[] => {
  const content = readFileSync(join(PROJECT_ROOT, 'CLAUDE.md'), 'utf-8');
  const out = new Set<string>();
  for (const m of content.matchAll(RELATIVE_LINK)) {
    const raw = m[1];
    if (raw !== undefined) out.add(decodeURIComponent(raw));
  }
  return [...out].sort();
};

const git = (args: readonly string[]): string =>
  execFileSync('git', [...args], { cwd: PROJECT_ROOT, encoding: 'utf-8' });

/** Caminhos rastreados pelo git — a resposta a "está no repositório", independente deste disco. */
const trackedPaths = (): ReadonlySet<string> =>
  new Set(git(['ls-files']).split('\n').filter(Boolean));

/** `true` se o caminho foi DELIBERADAMENTE excluído do repositório (entrada de `.gitignore`). */
const isDeliberatelyIgnored = (rel: string): boolean => {
  try {
    git(['check-ignore', '--quiet', '--', rel.replace(/^\.\//, '')]);
    return true;
  } catch {
    return false; // exit != 0 → não está ignorado
  }
};

describe('CLAUDE-MD-LINKS — a doc canônica não aponta para o vazio', () => {
  it('todo caminho relativo citado está no repositório (ou é local-only declarado)', () => {
    const tracked = trackedPaths();
    const inRepo = (rel: string): boolean => {
      const clean = rel.replace(/^\.\//, '').replace(/\/$/, '');
      if (tracked.has(clean)) return true; // arquivo rastreado
      for (const p of tracked) if (p.startsWith(`${clean}/`)) return true; // diretório com conteúdo
      return false;
    };
    const dead = linkedPaths().filter((rel) => !inRepo(rel) && !isDeliberatelyIgnored(rel));
    assert.deepEqual(
      dead,
      [],
      'CLAUDE.md cita caminhos que não existem — todo agente lê este arquivo:\n' + dead.join('\n'),
    );
  });

  it('há links a verificar (guarda contra regex que casa nada)', () => {
    assert.ok(
      linkedPaths().length > 0,
      'nenhum link relativo encontrado: a regex ou a convenção do arquivo mudou',
    );
  });

  // O escape do `.gitignore` é o ponto onde este gate pode ficar cego: se `check-ignore` passasse a
  // responder `true` para tudo, link morto nenhum seria acusado e a suíte seguiria verde. Estes dois
  // casos provam que os dois lados do predicado discriminam.
  it('o escape de local-only não cega o gate', () => {
    assert.equal(
      isDeliberatelyIgnored('./caminho/que/nunca/existiu'),
      false,
      'check-ignore aceitou um caminho arbitrário — o escape virou anistia geral',
    );
    assert.equal(
      isDeliberatelyIgnored('./handbook/guidelines/'),
      true,
      'handbook/guidelines/ deixou de ser local-only: ou saiu do .gitignore, ou o CLAUDE.md precisa parar de tratá-lo como não-versionado',
    );
  });
});
