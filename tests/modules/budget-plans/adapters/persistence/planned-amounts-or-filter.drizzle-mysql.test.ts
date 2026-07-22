/**
 * REPORTS-REALIZED-ENDPOINT (S6 do epico #502) — W0 RED · Frente A (ajuste OR na fatia 1).
 *
 * Pina a DECISAO DA P.O.: `listPlannedAmounts` com `partnerStateRef` E `partnerMunicipalityRef`
 * juntos deve SOMAR as DUAS Redes (OR no ON do LEFT JOIN), em vez de zerar. Hoje o adapter empurra
 * as duas condicoes como AND no ON -> nenhuma linha de `bgp_budgets` casa (uma Rede e estadual XOR
 * municipal) -> a soma sai ZERO. Este teste falha contra o impl atual (AND) e fica verde quando o
 * W1 troca o ON para `(kind='state' AND ref=?) OR (kind='municipality' AND ref=?)`.
 *
 * Um filtro SO (estado, ou municipio) continua como esta (a fatia 1 ja cobre isso no port test).
 * A grade de 12 meses e o boot-scoped ficam intactos: o OR vive no ON, NUNCA no WHERE (no WHERE
 * apagaria os meses zerados — CA3 da fatia 1).
 *
 * GATED (opt-in MYSQL_INTEGRATION=1, #500). No `pnpm test` PURO o bloco e inerte (nao ha Docker);
 * a RED efetiva desta frente so aparece contra MySQL real. Documentado como nao-executado ate #500.
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { sql } from 'drizzle-orm';

import {
  buildBudgetPlansReadPort,
  type BudgetPlansReadPort,
  type PlannedAmountRow,
} from '#src/modules/budget-plans/public-api/read.ts';
import {
  openBudgetPlansMysql,
  type BudgetPlansMysqlHandle,
} from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

if (integrationEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;
  const h = (): BudgetPlansMysqlHandle => {
    if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
    return handle;
  };

  const cleanAll = async (): Promise<void> => {
    const db = h().db;
    await db.execute(sql`DELETE FROM bgp_budget_results`);
    await db.execute(sql`DELETE FROM bgp_subcategories`);
    await db.execute(sql`DELETE FROM bgp_categories`);
    await db.execute(sql`DELETE FROM bgp_cost_centers`);
    await db.execute(sql`DELETE FROM bgp_budgets`);
    await db.execute(sql`DELETE FROM bgp_budget_plans`);
  };

  type Fx = Readonly<{
    planId: string;
    year: number;
    subId: string;
    stateBudgetId: string;
    stateRef: string;
    municipalityBudgetId: string;
    municipalityRef: string;
  }>;

  const seedPlan = async (year: number): Promise<Fx> => {
    const db = h().db;
    const s = h().schema;
    const at = new Date('2026-01-05T12:00:00.000Z');
    const fx: Fx = {
      planId: randomUUID(),
      year,
      subId: randomUUID(),
      stateBudgetId: randomUUID(),
      stateRef: randomUUID(),
      municipalityBudgetId: randomUUID(),
      municipalityRef: randomUUID(),
    };
    const costCenterId = randomUUID();
    const categoryId = randomUUID();

    await db.insert(s.budgetPlans).values({
      id: fx.planId,
      year: fx.year,
      programRef: randomUUID(),
      versionMajor: 1,
      versionMinor: 0,
      status: 'APROVADO',
      parentId: null,
      scenarioName: null,
      createdAt: at,
      updatedAt: at,
      updatedBy: null,
      legacyId: null,
    });
    await db.insert(s.costCenters).values({
      id: costCenterId,
      budgetPlanId: fx.planId,
      name: 'Centro OR',
      direction: 'A PAGAR',
      active: true,
      legacyId: null,
    });
    await db.insert(s.categories).values({
      id: categoryId,
      costCenterId,
      name: 'Categoria OR',
      active: true,
      legacyId: null,
    });
    await db.insert(s.subcategories).values({
      id: fx.subId,
      categoryId,
      name: 'Subcategoria OR',
      launchType: 'IPCA',
      active: true,
      legacyId: null,
    });
    await db.insert(s.budgets).values([
      {
        id: fx.stateBudgetId,
        budgetPlanId: fx.planId,
        partnerKind: 'state',
        partnerRef: fx.stateRef,
        legacyId: null,
      },
      {
        id: fx.municipalityBudgetId,
        budgetPlanId: fx.planId,
        partnerKind: 'municipality',
        partnerRef: fx.municipalityRef,
        legacyId: null,
      },
    ]);
    return fx;
  };

  const seedResult = async (
    budgetId: string,
    subcategoryId: string,
    month: number,
    valueCents: number,
  ): Promise<void> => {
    await h().db.insert(h().schema.budgetResults).values({
      id: randomUUID(),
      budgetId,
      subcategoryId,
      month,
      model: 'IPCA',
      valueCents,
      legacyId: null,
    });
  };

  const openPort = async (): Promise<BudgetPlansReadPort> => {
    const built = await buildBudgetPlansReadPort({ connectionString: VALID_CONN });
    if (!built.ok) throw new Error(`fixture: build falhou — ${built.error}`);
    return built.value;
  };
  const rowsOf = async (
    port: BudgetPlansReadPort,
    filter: Parameters<BudgetPlansReadPort['listPlannedAmounts']>[0],
  ): Promise<readonly PlannedAmountRow[]> => {
    const r = await port.listPlannedAmounts(filter);
    if (!r.ok) throw new Error(`listPlannedAmounts falhou — ${r.error}`);
    return r.value;
  };

  before(async () => {
    const opened = await openBudgetPlansMysql({
      connectionString: VALID_CONN,
      applyMigrations: true,
    });
    if (!opened.ok) throw new Error(`fixture: openBudgetPlansMysql falhou — ${opened.error}`);
    handle = opened.value;
  });
  after(async () => {
    if (handle !== null) {
      await cleanAll();
      await handle.close();
      handle = null;
    }
  });
  beforeEach(async () => {
    await cleanAll();
  });

  describe('BGP-READ-PORT · Frente A — estado + municipio juntos = OR (soma as duas Redes)', () => {
    it('estado E municipio juntos SOMAM as duas Redes (OR no ON), nunca zeram', async () => {
      const fx = await seedPlan(2060);
      await seedResult(fx.stateBudgetId, fx.subId, 6, 700_00);
      await seedResult(fx.municipalityBudgetId, fx.subId, 6, 300_00);

      const port = await openPort();
      const rows = await rowsOf(port, {
        budgetPlanId: fx.planId,
        partnerStateRef: fx.stateRef,
        partnerMunicipalityRef: fx.municipalityRef,
      });
      const row = rows.find((r) => r.subcategoryId === fx.subId && r.month === 6);

      assert.equal(row?.plannedCents, 1000_00, 'estado(700) + municipio(300) = 1000 (OR), nao 0');
      await port.close();
    });

    it('a grade de 12 meses sobrevive ao filtro combinado (OR no ON, nunca no WHERE)', async () => {
      const fx = await seedPlan(2061);
      await seedResult(fx.stateBudgetId, fx.subId, 6, 700_00);
      await seedResult(fx.municipalityBudgetId, fx.subId, 6, 300_00);

      const port = await openPort();
      const rows = await rowsOf(port, {
        budgetPlanId: fx.planId,
        partnerStateRef: fx.stateRef,
        partnerMunicipalityRef: fx.municipalityRef,
      });
      const subRows = rows.filter((r) => r.subcategoryId === fx.subId);
      assert.equal(
        subRows.length,
        12,
        'os 12 meses continuam presentes (OR no ON preserva a grade)',
      );
      assert.equal(
        subRows.filter((r) => r.month !== 6).every((r) => r.plannedCents === 0),
        true,
        'meses sem lancamento seguem zerados, nao ausentes',
      );
      await port.close();
    });

    it('um filtro SO (estado) continua como esta: soma apenas a Rede estadual', async () => {
      const fx = await seedPlan(2062);
      await seedResult(fx.stateBudgetId, fx.subId, 6, 700_00);
      await seedResult(fx.municipalityBudgetId, fx.subId, 6, 300_00);

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId, partnerStateRef: fx.stateRef });
      const row = rows.find((r) => r.subcategoryId === fx.subId && r.month === 6);
      assert.equal(row?.plannedCents, 700_00, 'so a Rede estadual — um filtro so nao vira OR');
      await port.close();
    });
  });
}
