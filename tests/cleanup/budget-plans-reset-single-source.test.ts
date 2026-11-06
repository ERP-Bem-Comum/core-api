/**
 * BUDGET-PLANS-RESET-SINGLE-SOURCE — teste só apaga `bgp_budget_plans` pelo helper.
 *
 * Molde: tests/cleanup/*.test.ts (varrem o fonte e exigem um estado desejado).
 *
 * `bgp_budget_plans.parent_id` é FK para a própria tabela, com RESTRICT. Um `DELETE` da tabela
 * inteira estoura 1451 quando há plano-filho — e quem deixa filho é o VIZINHO na suíte, então o
 * arquivo que quebra não é o que tem o defeito. Medido em 06/11/2026: a suíte `budget-plans`
 * falhava 9 casos na prova da ordem invertida. Havia três variantes da limpeza em 13 arquivos.
 *
 * `tests/support/budget-plans-reset.ts` (`deleteAllBudgetPlans`) desfaz a autorreferência antes de
 * apagar — qualquer profundidade. Este gate impede a quarta variante.
 */

import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';

import { PROJECT_ROOT, readSource } from '../support/source-scan.ts';

const HELPER = 'tests/support/budget-plans-reset.ts';
/** Este arquivo: as amostras da contraprova CONTÊM os padrões — varrê-lo seria acusar a si mesmo. */
const SELF = 'tests/cleanup/budget-plans-reset-single-source.test.ts';

/** `db.delete(x.schema.budgetPlans)` / `delete(budgetPlans)` e o SQL cru `DELETE FROM bgp_budget_plans`. */
const DIRECT_DELETE =
  /\.delete\(\s*(?:[\w.()]*\.)?(?:budgetPlans|bgpBudgetPlans)\s*\)|DELETE\s+FROM\s+`?bgp_budget_plans\b/i;

const codeLines = (rel: string): readonly string[] =>
  readSource(rel)
    .split('\n')
    .filter((line) => {
      const t = line.trimStart();
      return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
    });

const testSources = (): readonly string[] =>
  execFileSync('git', ['-C', PROJECT_ROOT, 'ls-files', 'tests/**/*.ts'], { encoding: 'utf-8' })
    .split('\n')
    .filter((f) => f.length > 0 && f !== HELPER && f !== SELF);

describe('BUDGET-PLANS-RESET-SINGLE-SOURCE', () => {
  it('o padrão reconhece as três variantes que existiam (contraprova)', () => {
    for (const sample of [
      'await h.db.delete(h.schema.budgetPlans);',
      'await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));',
      'await db.execute(sql`DELETE FROM bgp_budget_plans`);',
      'await db.delete(bgpBudgetPlans);',
    ]) {
      assert.match(sample, DIRECT_DELETE, `não reconheceu: ${sample}`);
    }
    for (const sample of [
      'await h.db.insert(h.schema.budgetPlans).values({});',
      'await deleteAllBudgetPlans(h.db);',
      'await h.db.delete(h.schema.costCenters);',
    ]) {
      assert.doesNotMatch(sample, DIRECT_DELETE, `falso positivo: ${sample}`);
    }
  });

  it('nenhum teste apaga bgp_budget_plans fora do helper', () => {
    const offenders = testSources()
      .filter((f) => codeLines(f).some((line) => DIRECT_DELETE.test(line)))
      .sort();
    assert.deepEqual(
      offenders,
      [],
      `apagam bgp_budget_plans direto (a FK auto-referente parent_id estoura 1451 com plano-filho):\n` +
        `${offenders.join('\n')}\nUsar \`deleteAllBudgetPlans\` de ${HELPER}.`,
    );
  });

  it('o helper existe e é usado (guarda contra verde por vacuidade)', () => {
    const users = testSources().filter((f) => readSource(f).includes('deleteAllBudgetPlans('));
    assert.ok(users.length >= 10, `esperava 10+ arquivos usando o helper, achei ${users.length}`);
  });
});
