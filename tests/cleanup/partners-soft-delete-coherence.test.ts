/**
 * PARTNERS-SOFT-DELETE-COHERENCE — quem tem `active` tem `deactivated_at` E o CHECK.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * Norma: ADR-0035. No módulo `partners` nada é apagado fisicamente — desmarcar é inativar. O par
 * `active` + `deactivated_at` só é confiável se os dois nunca divergirem, e é o CHECK no banco que
 * garante isso: `(active = FALSE) = (deactivated_at IS NOT NULL)`.
 *
 * Sem o CHECK, uma linha pode ficar `active = false` com `deactivated_at` nulo. O dado não fica
 * "um pouco errado": a data do desligamento some, que é justamente a auditabilidade pela qual o
 * ADR-0035 trocou o hard delete — o legado perdia esse fato e essa foi a razão da decisão.
 *
 * O risco real é de OMISSÃO, não de violação: uma tabela nova com `active` que não declare o CHECK
 * passa em todos os outros gates. Por isso a asserção é condicional — vale para quem tem `active`,
 * e as 8 tabelas sem soft-delete (outbox, DLQ, views de projeção, histórico, tokens de convite)
 * ficam de fora por natureza, não por exceção.
 *
 * NÃO cobra a convenção de NOME do check: cinco tabelas usam `*_active_consistency_chk` e
 * `par_collaborators` usa `par_collaborators_soft_delete_chk`. O constraint existe em todas — a
 * convenção é que nunca foi uniforme, e padronizá-la é decisão do dono do repo, não deste gate.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const PROJECT_ROOT = resolve(HERE, '..', '..');
const SCHEMA = join(PROJECT_ROOT, 'src/modules/partners/adapters/persistence/schemas/mysql.ts');

type Table = Readonly<{ name: string; block: string }>;

/** Fatia o arquivo de schema em blocos, um por `mysqlTable('nome', …)`. */
const tables = (): readonly Table[] => {
  const src = readFileSync(SCHEMA, 'utf-8');
  const starts: { name: string; at: number }[] = [];
  for (const m of src.matchAll(/mysqlTable\(\s*'([a-z_]+)'/g)) {
    const name = m[1];
    if (name !== undefined && m.index !== undefined) starts.push({ name, at: m.index });
  }
  return starts.map((s, i) => ({
    name: s.name,
    block: src.slice(s.at, i + 1 < starts.length ? starts[i + 1]?.at : undefined),
  }));
};

const hasActiveColumn = (block: string): boolean => /\bboolean\('active'\)/.test(block);
const hasDeactivatedAt = (block: string): boolean => block.includes("'deactivated_at'");
// Exige a ASSINATURA da coerência dentro de um `check(`: a equivalência entre `active = FALSE` e
// `deactivated_at IS NOT NULL`. Um `IS NOT NULL` solto no bloco não serve — apareceria em qualquer
// índice parcial ou condição alheia e tornaria o gate verde por frouxidão.
const hasCoherenceCheck = (block: string): boolean =>
  block.includes('check(') && /=\s*FALSE\)\s*=\s*\(.*IS NOT NULL/s.test(block);

describe('PARTNERS-SOFT-DELETE — active e deactivated_at não podem divergir', () => {
  it('toda tabela com `active` declara `deactivated_at`', () => {
    const offenders = tables()
      .filter((t) => hasActiveColumn(t.block) && !hasDeactivatedAt(t.block))
      .map((t) => t.name);
    assert.deepEqual(
      offenders,
      [],
      'Tabela com soft-delete sem a coluna de data — o fato do desligamento se perde (ADR-0035): ' +
        offenders.join(', '),
    );
  });

  it('toda tabela com `active` declara o CHECK de coerência', () => {
    const offenders = tables()
      .filter((t) => hasActiveColumn(t.block) && !hasCoherenceCheck(t.block))
      .map((t) => t.name);
    assert.deepEqual(
      offenders,
      [],
      'Tabela com soft-delete sem CHECK `(active = FALSE) = (deactivated_at IS NOT NULL)` — ' +
        'a linha pode ficar inativa sem data (ADR-0035): ' +
        offenders.join(', '),
    );
  });

  it('a varredura enxerga as tabelas e as que têm soft-delete', () => {
    const all = tables();
    const withSoftDelete = all.filter((t) => hasActiveColumn(t.block));
    assert.ok(all.length > 5, `esperado 5+ tabelas, encontrado ${all.length}`);
    assert.ok(
      withSoftDelete.length > 0,
      'nenhuma tabela com `active` encontrada — o parser provavelmente parou de casar',
    );
  });
});
