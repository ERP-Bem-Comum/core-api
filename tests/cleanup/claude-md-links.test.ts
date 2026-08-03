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
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
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

describe('CLAUDE-MD-LINKS — a doc canônica não aponta para o vazio', () => {
  it('todo caminho relativo citado existe no disco', () => {
    const dead = linkedPaths().filter((rel) => !existsSync(join(PROJECT_ROOT, rel)));
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
});
