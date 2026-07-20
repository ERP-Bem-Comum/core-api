/**
 * BGP-ETL-WRITE-PORT (fatia 2/3 do ETL-BUDGET-PLANS) — W0 RED.
 *
 * Porta de escrita do ETL no modulo budget-plans: `buildBudgetPlansEtlPort`. Molde direto de
 * `partners/public-api/etl.ts` (LegacyEntityStore<A, Ref>) e `financial/public-api/etl.ts`
 * (boot-scoped pool + close). DEVE FALHAR em W0: o modulo
 * `#src/modules/budget-plans/public-api/etl.ts` ainda NAO existe — o import de topo quebra
 * (ERR_MODULE_NOT_FOUND) e TODO este arquivo fica vermelho. Esse E' o RED pelo motivo certo.
 *
 * Estrutura (molde partners-etl-port.integration.test.ts + budget-plans/legacy-id.drizzle-mysql):
 *   1. Bloco ESTRUTURAL — `typeof buildBudgetPlansEtlPort === 'function'` (sem DB). RED via import.
 *   2. Bloco INTEGRACAO (opt-in MYSQL_INTEGRATION=1) — CA1/CA2/CA3/CA5 contra MySQL real.
 * CA4 (grep de imports ADR-0006) vive em `budget-plans-etl-boundary.test.ts` — NAO importa o port,
 * para poder rodar mesmo com o port ausente.
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { eq, sql } from 'drizzle-orm';

import {
  buildBudgetPlansEtlPort,
  type BudgetPlansEtlPort,
} from '#src/modules/budget-plans/public-api/etl.ts';
import {
  openBudgetPlansMysql,
  type BudgetPlansMysqlHandle,
} from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';

// A request fixa esta connection-string literal (mesma da fatia 1 legacy-id.drizzle-mysql).
const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
// String malformada: reprovada na validacao de formato do driver, SEM tocar o MySQL (CA5 sem DB).
const MALFORMED_CONN = 'not-a-mysql-url';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// ── Inputs de negocio que o mapper (fatia 3) enviara ao port. Plain rows (public-api),
//    NUNCA agregados de dominio (ADR-0006). `legacy_id` e' parametro separado do provision. ──
const aPlan = () =>
  ({
    id: randomUUID(),
    year: 2030,
    programRef: randomUUID(),
    versionMajor: 1,
    versionMinor: 0,
    status: 'RASCUNHO',
    parentId: null,
    scenarioName: null,
    // BGP-ETL-READER-MAPPER estendeu o input com a autoria migrada (decisao P.O. Opcao A);
    // nullable, entao null basta para os casos desta suite (nao exercitam a autoria).
    updatedBy: null,
    // BGP-ETL-PRESERVE-DATES: datas do legado (nao a data da migracao).
    createdAt: new Date('2025-01-10T12:00:00.000Z'),
    updatedAt: new Date('2025-02-01T09:00:00.000Z'),
  }) as const;

const aCostCenter = (budgetPlanId: string) =>
  ({
    id: randomUUID(),
    budgetPlanId,
    name: 'Centro de Custo A',
    direction: 'A PAGAR',
    active: true,
  }) as const;

const aCategory = (costCenterId: string) =>
  ({ id: randomUUID(), costCenterId, name: 'Categoria A', active: true }) as const;

const aSubcategory = (categoryId: string) =>
  ({
    id: randomUUID(),
    categoryId,
    name: 'Subcategoria A',
    launchType: 'IPCA',
    active: true,
  }) as const;

const aBudget = (budgetPlanId: string) =>
  ({ id: randomUUID(), budgetPlanId, partnerKind: 'state', partnerRef: randomUUID() }) as const;

const aBudgetResult = (budgetId: string, subcategoryId: string) =>
  ({
    id: randomUUID(),
    budgetId,
    subcategoryId,
    month: 1,
    model: 'IPCA',
    valueCents: 100_00,
  }) as const;

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL — RED via import (o modulo public-api/etl.ts nao existe).
// ─────────────────────────────────────────────────────────────────────────────
describe('BGP-ETL-WRITE-PORT — superficie do port (estrutural)', () => {
  it('exporta buildBudgetPlansEtlPort como funcao', () => {
    assert.equal(typeof buildBudgetPlansEtlPort, 'function');
  });

  it('CA5 (sem DB): connection-string malformada -> Result err com slug kebab EN, nunca throw', async () => {
    const r = await buildBudgetPlansEtlPort({ connectionString: MALFORMED_CONN });
    assert.equal(r.ok, false, 'string malformada deve reprovar');
    if (r.ok) return;
    assert.match(r.error, /^budget-plans-[a-z-]+$/, 'erro deve ser slug kebab EN');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRACAO (opt-in MYSQL_INTEGRATION=1) — CA1/CA2/CA3/CA5 contra MySQL real.
// ─────────────────────────────────────────────────────────────────────────────
if (integrationEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;

  const h = (): BudgetPlansMysqlHandle => {
    if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
    return handle;
  };

  // Limpeza FK-segura (filhos antes dos pais; budget_results nao tem FK fisica mas depende logicamente).
  const cleanAll = async (): Promise<void> => {
    const db = h().db;
    await db.execute(sql`DELETE FROM bgp_budget_results`);
    await db.execute(sql`DELETE FROM bgp_subcategories`);
    await db.execute(sql`DELETE FROM bgp_categories`);
    await db.execute(sql`DELETE FROM bgp_cost_centers`);
    await db.execute(sql`DELETE FROM bgp_budgets`);
    await db.execute(sql`DELETE FROM bgp_budget_plans`);
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

  // ── CA1 — pool boot-scoped: aberto 1x, close() encerra. ──────────────────────
  describe('BGP-ETL-WRITE-PORT · CA1 — pool boot-scoped (1x) + close() encerra', () => {
    it('constroi 1 port com 1 close; operacoes em varias entidades reusam o MESMO pool', async () => {
      const built = await buildBudgetPlansEtlPort({ connectionString: VALID_CONN });
      assert.equal(built.ok, true, 'buildBudgetPlansEtlPort deve suceder');
      if (!built.ok) return;
      const port: BudgetPlansEtlPort = built.value;
      assert.equal(typeof port.close, 'function', 'port deve expor close()');

      // Sequencia FK-segura via O MESMO port (se abrisse pool por operacao, o close() unico
      // abaixo nao derrubaria as ops seguintes — a prova negativa vem no proximo teste).
      const plan = aPlan();
      const p = await port.plans.provision(plan, 1001);
      assert.equal(p.ok && p.value === 'created', true);
      const cc = aCostCenter(plan.id);
      assert.equal((await port.costCenters.provision(cc, 2001)).ok, true);
      const cat = aCategory(cc.id);
      assert.equal((await port.categories.provision(cat, 3001)).ok, true);
      const sub = aSubcategory(cat.id);
      assert.equal((await port.subcategories.provision(sub, 4001)).ok, true);
      const bud = aBudget(plan.id);
      assert.equal((await port.budgets.provision(bud, 5001)).ok, true);
      const res = aBudgetResult(bud.id, sub.id);
      assert.equal((await port.budgetResults.provision(res, 6001)).ok, true);

      await port.close();
    });

    it('apos close() o pool esta encerrado: nova operacao NAO usa um pool novo (Result err, sem throw)', async () => {
      const built = await buildBudgetPlansEtlPort({ connectionString: VALID_CONN });
      assert.equal(built.ok, true);
      if (!built.ok) return;
      const port: BudgetPlansEtlPort = built.value;
      await port.close();

      // Prova de que o pool e' boot-scoped e unico: apos close(), o pool esta morto e a operacao
      // devolve Result err (nunca abre um pool novo por operacao — causa do Incident-0001).
      const afterClose = await port.plans.provision(aPlan(), 1002);
      assert.equal(afterClose.ok, false, 'apos close() a operacao deve falhar (pool encerrado)');
      if (!afterClose.ok) assert.match(afterClose.error, /^budget-plans-[a-z-]+$/);
    });
  });

  // ── CA2 — gravar entidade nova -> created, linha com legacy_id preenchido. ────
  describe('BGP-ETL-WRITE-PORT · CA2 — entidade nova grava linha com legacy_id', () => {
    it('plans.provision(novo, 7) -> created + linha com legacy_id=7 + findByLegacyId', async () => {
      const built = await buildBudgetPlansEtlPort({ connectionString: VALID_CONN });
      assert.equal(built.ok, true);
      if (!built.ok) return;
      const port: BudgetPlansEtlPort = built.value;

      const plan = aPlan();
      const first = await port.plans.provision(plan, 7);
      assert.equal(first.ok && first.value === 'created', true);

      const found = await port.plans.findByLegacyId(7);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, plan.id);

      const rows = await h()
        .db.select({ id: h().schema.budgetPlans.id })
        .from(h().schema.budgetPlans)
        .where(eq(h().schema.budgetPlans.legacyId, 7));
      assert.equal(rows.length, 1, 'exatamente 1 linha com legacy_id=7');

      await port.close();
    });
  });

  // ── CA3 — idempotencia: mesma entidade (mesmo legacy_id) 2x -> already-exists. ─
  describe('BGP-ETL-WRITE-PORT · CA3 — idempotencia por legacy_id (coracao da fatia)', () => {
    it('subcategories: 2a provision com mesmo legacy_id -> already-exists, sem duplicar, sem UNIQUE vazando', async () => {
      const built = await buildBudgetPlansEtlPort({ connectionString: VALID_CONN });
      assert.equal(built.ok, true);
      if (!built.ok) return;
      const port: BudgetPlansEtlPort = built.value;

      // Cadeia de pais (plano -> cost center -> categoria) para satisfazer as FKs da subcategoria.
      const plan = aPlan();
      await port.plans.provision(plan, 10);
      const cc = aCostCenter(plan.id);
      await port.costCenters.provision(cc, 20);
      const cat = aCategory(cc.id);
      await port.categories.provision(cat, 30);

      const first = await port.subcategories.provision(aSubcategory(cat.id), 40);
      assert.equal(first.ok && first.value === 'created', true, '1a vez = created');

      // 2a vez com o MESMO legacy_id (id/nome distintos): idempotente -> already-exists, sem throw.
      const again = await port.subcategories.provision(aSubcategory(cat.id), 40);
      assert.equal(again.ok, true, 'idempotencia NAO deve vazar erro de UNIQUE');
      assert.equal(again.ok && again.value === 'already-exists', true, '2a vez = already-exists');

      const rows = await h()
        .db.select({ id: h().schema.subcategories.id })
        .from(h().schema.subcategories)
        .where(eq(h().schema.subcategories.legacyId, 40));
      assert.equal(rows.length, 1, 'legacy_id=40 nao pode duplicar');

      await port.close();
    });

    it('budgetResults (lancamento): idempotente por legacy_id (2a = already-exists, 1 linha)', async () => {
      const built = await buildBudgetPlansEtlPort({ connectionString: VALID_CONN });
      assert.equal(built.ok, true);
      if (!built.ok) return;
      const port: BudgetPlansEtlPort = built.value;

      const plan = aPlan();
      await port.plans.provision(plan, 11);
      const cc = aCostCenter(plan.id);
      await port.costCenters.provision(cc, 21);
      const cat = aCategory(cc.id);
      await port.categories.provision(cat, 31);
      const sub = aSubcategory(cat.id);
      await port.subcategories.provision(sub, 41);
      const bud = aBudget(plan.id);
      await port.budgets.provision(bud, 51);

      const first = await port.budgetResults.provision(aBudgetResult(bud.id, sub.id), 61);
      assert.equal(first.ok && first.value === 'created', true);
      const again = await port.budgetResults.provision(aBudgetResult(bud.id, sub.id), 61);
      assert.equal(again.ok && again.value === 'already-exists', true);

      const rows = await h()
        .db.select({ id: h().schema.budgetResults.id })
        .from(h().schema.budgetResults)
        .where(eq(h().schema.budgetResults.legacyId, 61));
      assert.equal(rows.length, 1);

      await port.close();
    });
  });

  // ── CA5 — erro de conexao -> Result err com slug kebab EN, nunca throw (contra MySQL). ──
  describe('BGP-ETL-WRITE-PORT · CA5 — erro de conexao vira Result err', () => {
    it('host inexistente -> Result err kebab EN, sem exception cruzando a borda', async () => {
      const deadConn = 'mysql://root:rootpw-migration-test-only@127.0.0.1:59999/core';
      const r = await buildBudgetPlansEtlPort({ connectionString: deadConn });
      assert.equal(r.ok, false, 'conexao morta deve virar Result err');
      if (r.ok) return;
      assert.match(r.error, /^budget-plans-[a-z-]+$/);
    });
  });
}
