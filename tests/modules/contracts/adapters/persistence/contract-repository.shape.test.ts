/**
 * CTR-DB-REPO-LIST-N1 — W0 (RED) — regression guards estruturais
 *
 * Cobre:
 *   CA-13 — `list()` no source NÃO contém o padrão N+1 (loop com `await db.select()` sobre rows).
 *   CA-14 — junction insert em `persistContract` NÃO usa `for ... await tx.insert(...).values({...})`.
 *
 * Justificativa do meta-teste: a correção funcional do `list()` e do upsert
 * já é coberta pela suíte contratual (`contract-repository.suite.ts`).
 * O que falta é regression-guard de performance — N+1 e linha-a-linha são
 * antipadrões que não dão sinal funcional. Lemos o source via fs + regex e
 * afirmamos que o padrão proibido sumiu. Padrão pré-existente no projeto
 * (`tests/cleanup/sqlite-removal.test.ts` faz o mesmo).
 *
 * Sustentação: audit `handbook/reviews/0002-audit-adapters-persistence-mysql.md` §H1, §M4.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..', '..', '..', '..');
const REPO_SRC = resolve(
  PROJECT_ROOT,
  'src',
  'modules',
  'contracts',
  'adapters',
  'persistence',
  'repos',
  'contract-repository.drizzle.ts',
);

const readSource = (): string => readFileSync(REPO_SRC, 'utf-8');

// ─── Helpers que extraem o corpo de uma função top-level por nome ─────────
// Heurística estável: começa em `<NAME> =` e capta até o último `};`/`});`
// equilibrando chaves. Não é parser TS, mas para regression guard determinístico
// sobre código que JÁ COMPILA, é suficiente. Falsos positivos seriam visíveis.
const extractBlock = (source: string, header: RegExp): string => {
  const match = header.exec(source);
  if (!match) throw new Error(`bloco não encontrado: ${header.toString()}`);
  const start = match.index;
  let depth = 0;
  let i = start;
  let started = false;
  for (; i < source.length; i++) {
    const c = source[i];
    if (c === '{') {
      depth += 1;
      started = true;
    } else if (c === '}') {
      depth -= 1;
      if (started && depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }
  throw new Error(`bloco não fechou: ${header.toString()}`);
};

// ─── CA-13 — list() sem N+1 ───────────────────────────────────────────────
describe('CTR-DB-REPO-LIST-N1 — CA-13: list() sem N+1', () => {
  it('CA-13.1: list() faz no máximo 1 SELECT em ctr_contract_homologated_amendments', () => {
    const src = readSource();
    const listBlock = extractBlock(src, /list:\s*async\s*\(\)\s*=>/);
    // Conta ocorrências de `contractHomologatedAmendments` em statement de SELECT.
    // A query de SELECT na junction usa `.from(schema.contractHomologatedAmendments)`.
    const fromMatches = listBlock.match(/\.from\(\s*schema\.contractHomologatedAmendments\s*\)/g);
    const count = fromMatches?.length ?? 0;
    assert.ok(
      count <= 1,
      `list() deve ter no máximo 1 SELECT na junction; encontrado ${count}. ` +
        `Audit §H1: substituir loop por inArray + Map.`,
    );
  });

  it('CA-13.2: list() não contém SELECT da junction dentro de loop `for ... of rows`', () => {
    const src = readSource();
    const listBlock = extractBlock(src, /list:\s*async\s*\(\)\s*=>/);
    // Heurística: existe um `for (const X of <Y>)` cujo corpo contém
    // `.from(schema.contractHomologatedAmendments)` ?
    const offending =
      /for\s*\(\s*const\s+\w+\s+of\s+rows\s*\)\s*\{[\s\S]*?\.from\(\s*schema\.contractHomologatedAmendments\s*\)/.exec(
        listBlock,
      );
    assert.equal(
      offending,
      null,
      'list() ainda contém SELECT na junction dentro de for-loop sobre rows — padrão N+1 do audit §H1.',
    );
  });
});

// ─── CA-14 — persistContract junction em batch ────────────────────────────
describe('CTR-DB-REPO-LIST-N1 — CA-14: persistContract junction em batch', () => {
  it('CA-14: junction insert NÃO está dentro de for-loop linha-a-linha', () => {
    const src = readSource();
    const persistBlock = extractBlock(src, /const\s+persistContract\s*=\s*async/);
    // Padrão proibido: `for (...) { ... .insert(schema.contractHomologatedAmendments).values({...}) ... }`.
    // Detectamos a presença de qualquer `await tx.insert(schema.contractHomologatedAmendments).values({ ... })`
    // (single object literal) dentro de um `for (...)`.
    const offending =
      /for\s*\([\s\S]*?\)\s*\{[\s\S]*?\.insert\(\s*schema\.contractHomologatedAmendments\s*\)[\s\S]*?\.values\(\s*\{/.exec(
        persistBlock,
      );
    assert.equal(
      offending,
      null,
      'persistContract ainda popula junction linha-a-linha (audit §M4). ' +
        'Use `tx.insert(schema.contractHomologatedAmendments).values(rows)` com array.',
    );
  });
});
