/**
 * BGP-READ-PORT (fatia 1/3 de REPORTS-REALIZED-VS-PLANNED) — W0 RED.
 *
 * Read port (Open Host Service) do modulo budget-plans: `buildBudgetPlansReadPort`. Molde direto
 * de `programs/public-api/read.ts` e `partners/public-api/read.ts` (boot-scoped: pool aberto 1x,
 * close() encerra). DEVE FALHAR em W0: o modulo `#src/modules/budget-plans/public-api/read.ts`
 * ainda NAO existe — o import de topo quebra (ERR_MODULE_NOT_FOUND) e TODO este arquivo fica
 * vermelho. Esse E' o RED pelo motivo certo.
 *
 * Estrutura (molde budget-plans-etl-port.integration.test.ts):
 *   1. Bloco ESTRUTURAL — superficie do port + CA5 sem DB (conn malformada) + CA6 (fronteira
 *      ADR-0006 lida do fonte). Roda SEMPRE, sem Docker.
 *   2. Bloco INTEGRACAO (opt-in MYSQL_INTEGRATION=1) — CA1/CA2/CA3/CA4/CA6 contra MySQL real.
 *
 * DECISAO DE CONTRATO TRAVADA AQUI (recomendacao do 000-request, aceita):
 *   a saida e' PLANA — uma linha por (subcategoria, mes), carregando os 3 niveis desnormalizados
 *   (`costCenterId/Name`, `categoryId/Name`, `subcategoryId/Name`) + `month` + `plannedCents`.
 *   Motivo: o `reports` costura orcado x realizado ANTES de montar a arvore; devolver arvore
 *   pronta obrigaria a desmonta-la (ver REPORT do W0, secao "Forma da saida").
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
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

// A request fixa esta connection-string literal (mesma das fatias do ETL).
const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
// String malformada: reprovada na validacao de formato do driver, SEM tocar o MySQL (CA5 sem DB).
const MALFORMED_CONN = 'not-a-mysql-url';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const READ_PORT_SOURCE = new URL(
  '../../../../src/modules/budget-plans/public-api/read.ts',
  import.meta.url,
);

const ALL_MONTHS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL — RED via import (o modulo public-api/read.ts nao existe).
// ─────────────────────────────────────────────────────────────────────────────
describe('BGP-READ-PORT — superficie do port (estrutural)', () => {
  it('exporta buildBudgetPlansReadPort como funcao', () => {
    assert.equal(typeof buildBudgetPlansReadPort, 'function');
  });

  it('CA5 (sem DB): connection-string malformada -> Result err com slug kebab EN, nunca throw', async () => {
    const r = await buildBudgetPlansReadPort({ connectionString: MALFORMED_CONN });
    assert.equal(r.ok, false, 'string malformada deve reprovar');
    if (r.ok) return;
    assert.match(r.error, /^budget-plans-[a-z-]+$/, 'erro deve ser slug kebab EN');
  });

  it('CA6 (fonte): o port vive na public-api e NAO importa o dominio do modulo (ADR-0006)', async () => {
    const source = await readFile(READ_PORT_SOURCE, 'utf8');
    assert.equal(
      /from\s+'\.\.\/domain\//.test(source),
      false,
      'read.ts nao pode importar de ../domain/ — devolve plain rows, nunca agregados',
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRACAO (opt-in MYSQL_INTEGRATION=1) — CA1/CA2/CA3/CA4/CA6 contra MySQL real.
// ─────────────────────────────────────────────────────────────────────────────
if (integrationEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;

  const h = (): BudgetPlansMysqlHandle => {
    if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
    return handle;
  };

  // Limpeza FK-segura (filhos antes dos pais).
  const cleanAll = async (): Promise<void> => {
    const db = h().db;
    await db.execute(sql`DELETE FROM bgp_budget_results`);
    await db.execute(sql`DELETE FROM bgp_subcategories`);
    await db.execute(sql`DELETE FROM bgp_categories`);
    await db.execute(sql`DELETE FROM bgp_cost_centers`);
    await db.execute(sql`DELETE FROM bgp_budgets`);
    await db.execute(sql`DELETE FROM bgp_budget_plans`);
  };

  // ── Fixture: um plano completo (1 centro -> 1 categoria -> 2 subcategorias) com 2 Redes
  //    (1 estado + 1 municipio). Escrita direta via Drizzle (o W0 nao depende do port sob teste
  //    para semear — so para LER). Datas fixas: nada de Date.now() no arranjo. ──────────────
  type PlanFixture = Readonly<{
    planId: string;
    programRef: string;
    year: number;
    costCenterId: string;
    costCenterName: string;
    categoryId: string;
    categoryName: string;
    subA: Readonly<{ id: string; name: string }>;
    subB: Readonly<{ id: string; name: string }>;
    stateBudgetId: string;
    stateRef: string;
    municipalityBudgetId: string;
    municipalityRef: string;
  }>;

  const seedPlan = async (
    args: Readonly<{ year: number; programRef?: string; label: string }>,
  ): Promise<PlanFixture> => {
    const db = h().db;
    const s = h().schema;
    const at = new Date('2026-01-05T12:00:00.000Z');

    const fx: PlanFixture = {
      planId: randomUUID(),
      programRef: args.programRef ?? randomUUID(),
      year: args.year,
      costCenterId: randomUUID(),
      costCenterName: `Centro ${args.label}`,
      categoryId: randomUUID(),
      categoryName: `Categoria ${args.label}`,
      subA: { id: randomUUID(), name: `Subcategoria ${args.label}-A` },
      subB: { id: randomUUID(), name: `Subcategoria ${args.label}-B` },
      stateBudgetId: randomUUID(),
      stateRef: randomUUID(),
      municipalityBudgetId: randomUUID(),
      municipalityRef: randomUUID(),
    };

    await db.insert(s.budgetPlans).values({
      id: fx.planId,
      year: fx.year,
      programRef: fx.programRef,
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
      id: fx.costCenterId,
      budgetPlanId: fx.planId,
      name: fx.costCenterName,
      direction: 'A PAGAR',
      active: true,
      legacyId: null,
    });
    await db.insert(s.categories).values({
      id: fx.categoryId,
      costCenterId: fx.costCenterId,
      name: fx.categoryName,
      active: true,
      legacyId: null,
    });
    await db.insert(s.subcategories).values([
      {
        id: fx.subA.id,
        categoryId: fx.categoryId,
        name: fx.subA.name,
        launchType: 'IPCA',
        active: true,
        legacyId: null,
      },
      {
        id: fx.subB.id,
        categoryId: fx.categoryId,
        name: fx.subB.name,
        launchType: 'CAED',
        active: true,
        legacyId: null,
      },
    ]);
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
    args: Readonly<{
      budgetId: string;
      subcategoryId: string;
      month: number;
      valueCents: number;
    }>,
  ): Promise<void> => {
    await h().db.insert(h().schema.budgetResults).values({
      id: randomUUID(),
      budgetId: args.budgetId,
      subcategoryId: args.subcategoryId,
      month: args.month,
      model: 'IPCA',
      valueCents: args.valueCents,
      legacyId: null,
    });
  };

  const openPort = async (): Promise<BudgetPlansReadPort> => {
    const built = await buildBudgetPlansReadPort({ connectionString: VALID_CONN });
    // O guard vem ANTES do assert: `assert.equal` (strict) e' assertion signature
    // (`asserts actual is T`), entao apos ele o ramo `!built.ok` seria `never` e `built.error`
    // nao compilaria. Mesma intencao, mesma falha em runtime.
    if (!built.ok) throw new Error(`fixture: build falhou — ${built.error}`);
    assert.equal(built.ok, true, 'buildBudgetPlansReadPort deve suceder com conn valida');
    return built.value;
  };

  const rowsOf = async (
    port: BudgetPlansReadPort,
    filter: Parameters<BudgetPlansReadPort['listPlannedAmounts']>[0],
  ): Promise<readonly PlannedAmountRow[]> => {
    const r = await port.listPlannedAmounts(filter);
    // Mesma razao do guard-antes-do-assert em openPort().
    if (!r.ok) throw new Error(`listPlannedAmounts falhou — ${r.error}`);
    assert.equal(r.ok, true, 'listPlannedAmounts deve suceder');
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

  // ── CA1 — pool boot-scoped: aberto 1x, close() encerra. ────────────────────
  describe('BGP-READ-PORT · CA1 — pool boot-scoped (1x) + close() encerra', () => {
    it('1 port = 1 pool: varias leituras reusam o MESMO pool e ha 1 close()', async () => {
      const fx = await seedPlan({ year: 2031, label: 'CA1' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 1,
        valueCents: 10_00,
      });

      const port = await openPort();
      assert.equal(typeof port.close, 'function', 'port deve expor close()');

      // 3 leituras seguidas pelo MESMO port — se abrisse pool por operacao, o close() unico
      // abaixo nao derrubaria as leituras seguintes (a prova negativa vem no proximo teste).
      const a = await rowsOf(port, { budgetPlanId: fx.planId });
      const b = await rowsOf(port, { budgetPlanId: fx.planId });
      const c = await rowsOf(port, { year: 2031 });
      assert.equal(a.length > 0, true);
      assert.equal(b.length, a.length);
      assert.equal(c.length, a.length);

      await port.close();
    });

    it('apos close() nova leitura NAO abre pool novo: devolve Result err, sem throw', async () => {
      const fx = await seedPlan({ year: 2032, label: 'CA1b' });
      const port = await openPort();
      await port.close();

      // Prova de que o pool e' boot-scoped e unico: apos close(), o pool esta morto e a leitura
      // devolve Result err (nunca abre um pool novo por requisicao — causa do Incident-0001).
      const afterClose = await port.listPlannedAmounts({ budgetPlanId: fx.planId });
      assert.equal(afterClose.ok, false, 'apos close() a leitura deve falhar (pool encerrado)');
      if (!afterClose.ok) assert.match(afterClose.error, /^budget-plans-[a-z-]+$/);
    });
  });

  // ── CA2 — os 3 niveis da arvore com id/name, escopados pelo plano. ─────────
  describe('BGP-READ-PORT · CA2 — nos da arvore (centro -> categoria -> subcategoria) com id/name', () => {
    it('cada linha carrega os 3 niveis desnormalizados com id e name', async () => {
      const fx = await seedPlan({ year: 2033, label: 'CA2' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 4,
        valueCents: 500_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId });

      const row = rows.find((r) => r.subcategoryId === fx.subA.id && r.month === 4);
      assert.notEqual(row, undefined, 'deve existir linha da subcategoria A no mes 4');
      if (row === undefined) return;

      assert.equal(row.budgetPlanId, fx.planId);
      assert.equal(row.costCenterId, fx.costCenterId);
      assert.equal(row.costCenterName, fx.costCenterName);
      assert.equal(row.categoryId, fx.categoryId);
      assert.equal(row.categoryName, fx.categoryName);
      assert.equal(row.subcategoryId, fx.subA.id);
      assert.equal(row.subcategoryName, fx.subA.name);

      await port.close();
    });

    it('escopado pelo plano: nos de OUTRO plano nao vazam no resultado', async () => {
      const mine = await seedPlan({ year: 2034, label: 'CA2-meu' });
      const other = await seedPlan({ year: 2035, label: 'CA2-outro' });
      await seedResult({
        budgetId: mine.stateBudgetId,
        subcategoryId: mine.subA.id,
        month: 2,
        valueCents: 100_00,
      });
      await seedResult({
        budgetId: other.stateBudgetId,
        subcategoryId: other.subA.id,
        month: 2,
        valueCents: 999_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: mine.planId });

      assert.equal(
        rows.every((r) => r.budgetPlanId === mine.planId),
        true,
        'toda linha deve pertencer ao plano filtrado',
      );
      assert.equal(
        rows.some((r) => r.subcategoryId === other.subA.id),
        false,
        'subcategoria de outro plano nao pode vazar',
      );

      await port.close();
    });

    it('subcategoria sem NENHUM lancamento ainda aparece (a arvore vem do plano, nao do lancamento)', async () => {
      const fx = await seedPlan({ year: 2036, label: 'CA2-vazia' });
      // So a subcategoria A recebe lancamento; a B fica sem nenhum.
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 6,
        valueCents: 42_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId });

      const bRows = rows.filter((r) => r.subcategoryId === fx.subB.id);
      assert.equal(bRows.length, 12, 'subcategoria sem lancamento deve vir com os 12 meses');
      assert.equal(
        bRows.every((r) => r.plannedCents === 0),
        true,
        'subcategoria sem lancamento vem zerada, nao ausente',
      );

      await port.close();
    });
  });

  // ── CA3 — plannedCents por (subcategoria, mes): OS 12 MESES, incluindo zerados. ──
  describe('BGP-READ-PORT · CA3 — grade de 12 meses por subcategoria (zerados inclusos)', () => {
    it('subcategoria com lancamento em 2 meses devolve 12 linhas; os outros 10 vem com 0', async () => {
      const fx = await seedPlan({ year: 2037, label: 'CA3' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 3,
        valueCents: 300_00,
      });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 7,
        valueCents: 700_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId });
      const aRows = rows.filter((r) => r.subcategoryId === fx.subA.id);

      assert.equal(aRows.length, 12, 'exatamente 12 linhas por subcategoria');
      assert.deepEqual(
        aRows.map((r) => r.month),
        ALL_MONTHS,
        'meses em ordem ascendente 1..12 (contrato de ordenacao do port)',
      );
      const byMonth = new Map(aRows.map((r) => [r.month, r.plannedCents]));
      assert.equal(byMonth.get(3), 300_00);
      assert.equal(byMonth.get(7), 700_00);
      assert.equal(
        ALL_MONTHS.filter((m) => m !== 3 && m !== 7).every((m) => byMonth.get(m) === 0),
        true,
        'meses sem lancamento vem com plannedCents = 0',
      );

      await port.close();
    });

    it('plannedCents SOMA as Redes quando nenhum filtro de Rede e aplicado', async () => {
      const fx = await seedPlan({ year: 2038, label: 'CA3-soma' });
      // Mesma (subcategoria, mes) em DUAS Redes: o total do no e' a soma.
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 5,
        valueCents: 200_00,
      });
      await seedResult({
        budgetId: fx.municipalityBudgetId,
        subcategoryId: fx.subA.id,
        month: 5,
        valueCents: 50_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId });
      const row = rows.find((r) => r.subcategoryId === fx.subA.id && r.month === 5);

      assert.notEqual(row, undefined);
      assert.equal(row?.plannedCents, 250_00, 'estado + municipio = 250,00');
      assert.equal(typeof row?.plannedCents, 'number', 'cents e number (bigint mode number)');

      await port.close();
    });

    it('nao duplica linha por (subcategoria, mes): a grade e unica', async () => {
      const fx = await seedPlan({ year: 2039, label: 'CA3-uq' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 9,
        valueCents: 10_00,
      });
      await seedResult({
        budgetId: fx.municipalityBudgetId,
        subcategoryId: fx.subA.id,
        month: 9,
        valueCents: 10_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId });

      const keys = rows.map((r) => `${r.subcategoryId}:${String(r.month)}`);
      assert.equal(new Set(keys).size, keys.length, '(subcategoria, mes) e chave unica da saida');
      // 2 subcategorias x 12 meses = 24 linhas.
      assert.equal(rows.length, 24);

      await port.close();
    });
  });

  // ── CA4 — filtros combinaveis: programa, plano, ano, estado/municipio. ─────
  describe('BGP-READ-PORT · CA4 — filtros (programa, plano, ano, estado/municipio) combinaveis', () => {
    it('filtro por ano isola o plano do ano pedido', async () => {
      const y40 = await seedPlan({ year: 2040, label: 'CA4-40' });
      const y41 = await seedPlan({ year: 2041, label: 'CA4-41' });
      await seedResult({
        budgetId: y40.stateBudgetId,
        subcategoryId: y40.subA.id,
        month: 1,
        valueCents: 40_00,
      });
      await seedResult({
        budgetId: y41.stateBudgetId,
        subcategoryId: y41.subA.id,
        month: 1,
        valueCents: 41_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { year: 2040 });

      assert.equal(
        rows.every((r) => r.budgetPlanId === y40.planId),
        true,
        'ano 2040 traz so o plano de 2040',
      );
      await port.close();
    });

    it('filtro por programa isola o programa pedido', async () => {
      const prog = randomUUID();
      const mine = await seedPlan({ year: 2042, programRef: prog, label: 'CA4-prog' });
      const other = await seedPlan({ year: 2043, label: 'CA4-outro-prog' });
      await seedResult({
        budgetId: mine.stateBudgetId,
        subcategoryId: mine.subA.id,
        month: 1,
        valueCents: 1_00,
      });
      await seedResult({
        budgetId: other.stateBudgetId,
        subcategoryId: other.subA.id,
        month: 1,
        valueCents: 2_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { programRef: prog });

      assert.equal(rows.length > 0, true, 'programa filtrado deve trazer linhas');
      assert.equal(
        rows.every((r) => r.budgetPlanId === mine.planId),
        true,
        'programa filtrado nao traz plano de outro programa',
      );
      await port.close();
    });

    it('filtro por estado (bgp_budgets.partnerKind/partnerRef) soma so a Rede estadual', async () => {
      const fx = await seedPlan({ year: 2044, label: 'CA4-estado' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 8,
        valueCents: 700_00,
      });
      await seedResult({
        budgetId: fx.municipalityBudgetId,
        subcategoryId: fx.subA.id,
        month: 8,
        valueCents: 300_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { partnerStateRef: fx.stateRef });
      const row = rows.find((r) => r.subcategoryId === fx.subA.id && r.month === 8);

      assert.equal(row?.plannedCents, 700_00, 'so a Rede estadual entra no total');
      await port.close();
    });

    it('filtro por municipio soma so a Rede municipal', async () => {
      const fx = await seedPlan({ year: 2045, label: 'CA4-municipio' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 8,
        valueCents: 700_00,
      });
      await seedResult({
        budgetId: fx.municipalityBudgetId,
        subcategoryId: fx.subA.id,
        month: 8,
        valueCents: 300_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { partnerMunicipalityRef: fx.municipalityRef });
      const row = rows.find((r) => r.subcategoryId === fx.subA.id && r.month === 8);

      assert.equal(row?.plannedCents, 300_00, 'so a Rede municipal entra no total');
      await port.close();
    });

    it('filtros COMBINAM (AND): plano + ano + estado', async () => {
      const fx = await seedPlan({ year: 2046, label: 'CA4-combo' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 11,
        valueCents: 111_00,
      });
      await seedResult({
        budgetId: fx.municipalityBudgetId,
        subcategoryId: fx.subA.id,
        month: 11,
        valueCents: 222_00,
      });

      const port = await openPort();

      const hit = await rowsOf(port, {
        budgetPlanId: fx.planId,
        year: 2046,
        partnerStateRef: fx.stateRef,
      });
      const row = hit.find((r) => r.subcategoryId === fx.subA.id && r.month === 11);
      assert.equal(row?.plannedCents, 111_00, 'combinacao coerente traz so a Rede estadual');

      // Combinacao contraditoria (plano de 2046 + ano 2047) nao pode "cair no OR" e trazer linha.
      const miss = await rowsOf(port, { budgetPlanId: fx.planId, year: 2047 });
      assert.equal(miss.length, 0, 'filtros sao AND, nunca OR');

      await port.close();
    });

    it('sem filtro nenhum devolve a grade de todos os planos (sem explodir)', async () => {
      const a = await seedPlan({ year: 2048, label: 'CA4-todos-a' });
      const b = await seedPlan({ year: 2049, label: 'CA4-todos-b' });
      await seedResult({
        budgetId: a.stateBudgetId,
        subcategoryId: a.subA.id,
        month: 1,
        valueCents: 1_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, {});

      // 2 planos x 2 subcategorias x 12 meses = 48.
      assert.equal(rows.length, 48);
      assert.equal(
        rows.some((r) => r.budgetPlanId === a.planId) &&
          rows.some((r) => r.budgetPlanId === b.planId),
        true,
        'sem filtro, os dois planos aparecem',
      );

      await port.close();
    });
  });

  // ── CA6 — plain rows, nunca agregado de dominio (ADR-0006). ────────────────
  describe('BGP-READ-PORT · CA6 — a saida e plain row (ADR-0006)', () => {
    it('linha e objeto plano: prototipo Object, zero metodos, so string|number', async () => {
      const fx = await seedPlan({ year: 2050, label: 'CA6' });
      await seedResult({
        budgetId: fx.stateBudgetId,
        subcategoryId: fx.subA.id,
        month: 12,
        valueCents: 99_00,
      });

      const port = await openPort();
      const rows = await rowsOf(port, { budgetPlanId: fx.planId });
      const row = rows[0];
      assert.notEqual(row, undefined);
      if (row === undefined) return;

      assert.equal(
        Object.getPrototypeOf(row) === Object.prototype || Object.getPrototypeOf(row) === null,
        true,
        'linha deve ser objeto plano (sem classe/prototipo de agregado)',
      );
      assert.equal(
        Object.values(row).every((v) => typeof v === 'string' || typeof v === 'number'),
        true,
        'todo valor e string ou number — nada de VO/Money/Result aninhado',
      );

      await port.close();
    });
  });
}
