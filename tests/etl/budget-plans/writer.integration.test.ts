/**
 * BGP-ETL-READER-MAPPER (fatia 3/3) · W0 (gated, roda no W3/CI) — integracao full-cycle.
 * DEVE FALHAR/PULAR em W0: `scripts/etl/budget-plans/main.ts` ainda nao existe (RED por
 * inexistencia). Quando o W1 construir o main, este arquivo carrega e PULA sem as envs.
 *
 * SEM Docker (ETL-LEGACY-DIRECT-CONNECTION): legado via ETL_LEGACY_CONNECTION_STRING e core-api
 * destino via ETL_CORE_CONNECTION_STRING. Opt-in PARTNERS_ETL_INTEGRATION=1 + as URLs; sem elas
 * `pnpm test` PULA (nunca RED apos o W1). Prova as contagens medidas contra o banco de referencia
 * e a idempotencia. Reusa `scripts/etl/reconcile.ts` (isBalanced). JAMAIS o dump de producao.
 *
 * Numeros medidos (ETL-BUDGET-PLANS): 5 planos · 5 budgets · 4679 lancamentos · 36 cost centers ·
 * 38 categorias · 390 subcategorias. model: 4367 IPCA · 276 PESSOAIS · 36 LOGISTICAS.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import { runBudgetPlansEtl } from '#scripts/etl/budget-plans/main.ts';
import { isBalanced, type EntityTally } from '#scripts/etl/reconcile.ts';
import { loadLegacyFixture } from '../helpers/load-fixture.ts';

const LEGACY_CONN = process.env['ETL_LEGACY_CONNECTION_STRING'];
const RUN = process.env['PARTNERS_ETL_INTEGRATION'] === '1' && LEGACY_CONN !== undefined;
const FIXTURE = 'tests/etl/fixtures/legacy-mini.sql';

const CORE_CONN =
  process.env['ETL_CORE_CONNECTION_STRING'] ??
  `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;

const skipReason = RUN
  ? false
  : 'PARTNERS_ETL_INTEGRATION!=1 ou ETL_LEGACY_CONNECTION_STRING ausente';

const opts = { connectionString: CORE_CONN, dryRun: false } as const;

describe('BUDGET-PLANS ETL integration — legado -> bgp_*', { skip: skipReason }, () => {
  before(async () => {
    await loadLegacyFixture(LEGACY_CONN!, FIXTURE);
  });

  it('contagens medidas (CA1) + balanco por entidade (CA2) + model derivado (CA4)', async () => {
    const r = await runBudgetPlansEtl(opts);
    assert.ok(r.ok, `budget-plans ETL deve suceder: ${JSON.stringify(r)}`);
    if (!r.ok) return;
    const report = r.value;

    // CA1 — contagens contra o banco de referencia.
    assert.equal(report.plans.read, 5);
    assert.equal(report.budgets.read, 5);
    assert.equal(report.budgetResults.read, 4679);
    assert.equal(report.costCenters.read, 36);
    assert.equal(report.categories.read, 38);
    assert.equal(report.subcategories.read, 390);

    // CA2 — read = migrated + quarantined + alreadyExists por entidade.
    const tallies: readonly EntityTally[] = [
      report.plans,
      report.budgets,
      report.costCenters,
      report.categories,
      report.subcategories,
      report.budgetResults,
    ];
    for (const t of tallies) assert.ok(isBalanced(t), `desbalanceado: ${JSON.stringify(t)}`);

    // CA4 — model derivado da releaseType.
    assert.deepEqual(report.byModel, {
      IPCA: 4367,
      DESPESAS_PESSOAIS: 276,
      DESPESAS_LOGISTICAS: 36,
    });

    // CA5 — soma dos valueCents migrados por Rede = budgets.valueInCents do legado (diferenca 0).
    assert.equal(report.valueDiffCents, 0);
  });

  it('idempotencia (CA3): 2a rodada = tudo already-exists, zero duplicata', async () => {
    const second = await runBudgetPlansEtl(opts);
    assert.ok(second.ok);
    if (!second.ok) return;

    assert.equal(second.value.budgetResults.migrated, 0);
    assert.equal(second.value.budgetResults.alreadyExists, 4679);
    assert.equal(second.value.plans.migrated, 0);
    assert.equal(second.value.plans.alreadyExists, 5);
  });
});
