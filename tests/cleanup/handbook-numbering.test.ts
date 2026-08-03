/**
 * HANDBOOK-NUMBERING — numeração única e índice que bate com o disco.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Origem: o inventário de decisões (`context/decisions/_PROGRESS.md`) registrou este gate como
 * candidato depois de encontrar a QUARTA colisão de numeração do repositório. O caso mais caro foi
 * o `ADR-0034`: dois arquivos reivindicaram o número entre 2026-06-08 e 2026-07-31, e como só um
 * deles estava no índice, resolver "Supersedes ADR-0034" pela via natural concluía que a adoção do
 * Bruno havia sido superseded — falsa, e o Bruno seguia obrigatório por ADR-0038. Quatro
 * reincidências é padrão, não acidente.
 *
 * A mecânica que produz a colisão é sempre a mesma: um arquivo posterior pega um número ocupado e
 * nunca entra no índice. Por isso o gate cobre as DUAS pontas — prefixo único E disco × índice.
 *
 * Não cobre `handbook/inquiries/` no quesito índice: o INDEX.md de lá não é uma tabela de links
 * um-para-um como o README dos ADRs.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const ADR_DIR = join(PROJECT_ROOT, 'handbook/architecture/adr');
const INQUIRIES_DIR = join(PROJECT_ROOT, 'handbook/inquiries');

/**
 * 🔒 Allowlist PINADA — colisões conhecidas e ainda não resolvidas. Cada entrada tem justificativa,
 * e o pin por deepEqual impede que a lista cresça em silêncio.
 */
const KNOWN_COLLISIONS: readonly string[] = [
  // `0011-auditoria-fiscal-cross-periodo.md` (no índice) × `0011-typedarrays-immutability-tc39-watchlist.md`
  // (fora dele). Mesma mecânica do ADR-0034; registrada em context/decisions/_PROGRESS.md.
  // Resolver exige renumerar uma inquiry — decisão do dono do repo, não deste gate.
  'inquiries:0011',
];

const numericPrefixes = (dir: string): readonly string[] =>
  readdirSync(dir)
    .filter((f) => /^\d{4}-/.test(f))
    .map((f) => f.slice(0, 4));

const duplicates = (values: readonly string[]): readonly string[] => {
  const seen = new Set<string>();
  const dup = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) dup.add(v);
    seen.add(v);
  }
  return [...dup].sort();
};

describe('HANDBOOK-NUMBERING — prefixo numérico é único', () => {
  it('nenhum par de ADRs compartilha prefixo', () => {
    assert.deepEqual(
      duplicates(numericPrefixes(ADR_DIR)),
      [],
      'dois ADRs reivindicam o mesmo número — "Supersedes ADR-NNNN" passa a ser ambíguo',
    );
  });

  it('nenhum par de inquiries compartilha prefixo, fora das colisões pinadas', () => {
    const offenders = duplicates(numericPrefixes(INQUIRIES_DIR))
      .map((n) => `inquiries:${n}`)
      .filter((k) => !KNOWN_COLLISIONS.includes(k));
    assert.deepEqual(
      offenders,
      [],
      `colisão NOVA de numeração em inquiries: ${offenders.join(', ')}`,
    );
  });

  it('a allowlist de colisões está pinada (não cresce em silêncio)', () => {
    assert.deepEqual([...KNOWN_COLLISIONS].sort(), ['inquiries:0011']);
  });
});

describe('HANDBOOK-NUMBERING — o índice de ADRs bate com o disco', () => {
  const indexContent = (): string => readFileSync(join(ADR_DIR, 'README.md'), 'utf-8');

  it('todo ADR no disco aparece no índice', () => {
    const missing = readdirSync(ADR_DIR)
      .filter((f) => /^\d{4}-.*\.md$/.test(f))
      .filter((f) => !indexContent().includes(f))
      .sort();
    assert.deepEqual(
      missing,
      [],
      'ADRs no disco ausentes do índice — é assim que uma colisão de número passa despercebida:\n' +
        missing.join('\n'),
    );
  });

  it('todo ADR citado no índice existe no disco', () => {
    const cited = new Set<string>();
    for (const m of indexContent().matchAll(/\]\(\.\/(\d{4}-[^)\s#]+\.md)\)/g)) {
      const f = m[1];
      if (f !== undefined) cited.add(f);
    }
    const dead = [...cited].filter((f) => !existsSync(join(ADR_DIR, f))).sort();
    assert.deepEqual(dead, [], 'índice cita ADRs inexistentes:\n' + dead.join('\n'));
  });
});
