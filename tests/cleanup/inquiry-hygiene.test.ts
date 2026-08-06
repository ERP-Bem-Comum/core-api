/**
 * INQUIRY-HYGIENE — o acervo de investigação declara seu estado, e o índice bate com o disco.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Origem: levantamento de 2026-08-06 sobre as 29 inquiries. Dois defeitos, ambos de higiene:
 *
 *   1. SEIS rótulos de status ad-hoc no disco ("Decided", "Concluída", "Watch", "Deferred",
 *      "⚠️ OBSOLETA", "Open — aguardando…") contra os 7 canônicos que o README define — nenhum
 *      dos dois conjuntos casando com o outro. Status em prosa livre não é consultável: não dá
 *      para perguntar "o que está aberto?" a um campo que cada arquivo preenche do seu jeito.
 *   2. O INDEX.md contava 8 abertas e o disco tinha 9. Índice mantido à mão diverge — foi assim
 *      que a colisão de numeração que o `handbook-numbering` hoje barra passou despercebida.
 *
 * A correção foi frontmatter YAML com estado de um conjunto FECHADO (modelo dos estados de RFD
 * da Oxide, reduzido aos cinco que este repositório usa). Este teste é o que impede a volta ao
 * estado anterior: rótulo novo inventado falha, e arquivo fora do índice falha.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const DIR = resolve(HERE, '..', '..', 'handbook/inquiries');

/** Conjunto FECHADO. Um estado novo exige editar este teste — que é o ponto. */
const STATES = ['open', 'blocked', 'decided', 'deferred', 'superseded'] as const;

const files = (): readonly string[] =>
  readdirSync(DIR)
    .filter((f) => /^\d{4}-.*\.md$/.test(f))
    .sort();

const frontmatter = (file: string): Record<string, string> => {
  const raw = readFileSync(join(DIR, file), 'utf-8');
  const m = /^---\n([\s\S]*?)\n---/.exec(raw);
  if (m === null) return {};
  const out: Record<string, string> = {};
  for (const line of (m[1] ?? '').split('\n')) {
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (kv?.[1] !== undefined) out[kv[1]] = (kv[2] ?? '').trim();
  }
  return out;
};

describe('INQUIRY-HYGIENE — cada inquiry declara um estado consultável', () => {
  it('toda inquiry tem frontmatter com inquiry, title e state', () => {
    const bad = files()
      .filter((f) => {
        const fm = frontmatter(f);
        return (
          fm['inquiry'] === undefined || fm['title'] === undefined || fm['state'] === undefined
        );
      })
      .sort();
    assert.deepEqual(
      bad,
      [],
      'inquiry sem frontmatter completo — o estado volta a ser prosa livre, e "o que está aberto?" deixa de ter resposta:\n' +
        bad.join('\n'),
    );
  });

  it('todo state pertence ao conjunto fechado', () => {
    const bad = files()
      .map((f) => ({ f, s: frontmatter(f)['state'] }))
      .filter((x) => x.s !== undefined && !STATES.includes(x.s as (typeof STATES)[number]))
      .map((x) => `${x.f}: "${x.s ?? ''}"`)
      .sort();
    assert.deepEqual(
      bad,
      [],
      `state fora de [${STATES.join(', ')}] — foi exatamente assim que seis rótulos ad-hoc nasceram:\n` +
        bad.join('\n'),
    );
  });

  it('o prefixo do arquivo casa com o campo inquiry', () => {
    const bad = files()
      .filter((f) => frontmatter(f)['inquiry'] !== f.slice(0, 4))
      .sort();
    assert.deepEqual(bad, [], 'frontmatter e nome do arquivo divergem:\n' + bad.join('\n'));
  });

  it('a varredura enxerga o acervo (guarda contra verde por vacuidade)', () => {
    assert.ok(
      files().length >= 25,
      `só ${files().length} inquiries encontradas — o glob quebrou e este arquivo passaria sem verificar nada`,
    );
  });
});

describe('INQUIRY-HYGIENE — o índice bate com o disco', () => {
  const index = (): string => readFileSync(join(DIR, 'INDEX.md'), 'utf-8');

  /**
   * Casa a LINHA DE TABELA inteira, não o nome solto. Um `includes(nome)` passa num índice
   * corrompido: quando o gerador colapsou 4 arquivos numa linha só, todos os nomes seguiam
   * presentes no texto e o teste ficou verde sobre uma tabela quebrada. Falso-verde é pior que
   * o falso-vermelho que ele substitui.
   */
  const rows = (): readonly string[] =>
    [...index().matchAll(/^\| \[(\d{4})\]\(\.\/(\d{4}-[^)\s]+\.md)\) \|/gm)]
      .map((m) => m[2])
      .filter((f): f is string => f !== undefined);

  it('toda inquiry no disco tem uma linha própria no índice', () => {
    const listed = new Set(rows());
    const missing = files()
      .filter((f) => !listed.has(f))
      .sort();
    assert.deepEqual(
      missing,
      [],
      'inquiry sem linha própria no INDEX.md — regere com o script do README, não edite à mão:\n' +
        missing.join('\n'),
    );
  });

  it('o índice tem uma linha por inquiry (guarda contra tabela colapsada)', () => {
    assert.equal(
      rows().length,
      files().length,
      `o índice tem ${rows().length} linhas de tabela para ${files().length} inquiries — ` +
        'divergência indica tabela malformada ou entrada duplicada',
    );
  });

  it('toda inquiry citada no índice existe no disco', () => {
    const cited = new Set<string>();
    for (const m of index().matchAll(/\]\(\.\/(\d{4}-[^)\s#]+\.md)\)/g)) {
      const f = m[1];
      if (f !== undefined) cited.add(f);
    }
    const dead = [...cited].filter((f) => !files().includes(f)).sort();
    assert.deepEqual(dead, [], 'índice cita inquiry inexistente:\n' + dead.join('\n'));
  });
});
