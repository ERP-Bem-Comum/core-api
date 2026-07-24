// W0 RED (BGP-ETL-LEGACY-ID · fatia 1/3 do ETL-BUDGET-PLANS) — coluna `legacy_id INT NULL`
// + indice UNIQUE nas 6 tabelas bgp_*. Puramente estrutural: prova o CONTRATO de constraint que
// destrava a idempotencia da ETL (o `alreadyExists` do scripts/etl/reconcile.ts depende disso).
//
// DEVE FALHAR em W0: nenhuma tabela bgp_* tem `legacy_id` hoje (o schema/migration ainda nao a cria).
//
// Estrutura (molde budget-result.drizzle-mysql.test.ts + fin-outbox-schema.drizzle-mysql.test.ts):
//   1. Bloco ESTRUTURAL (sempre roda, sem DB) — introspecta o schema Drizzle: coluna + UNIQUE.
//      E' o RED que aparece no `pnpm test` puro (nao precisa de MySQL).
//   2. Bloco INTEGRACAO (opt-in MYSQL_INTEGRATION=1) — prova os CAs contra MySQL real:
//      CA1 (information_schema), CA2 (multiplos NULL convivem), CA3 (mesmo legacy_id -> UNIQUE erro),
//      CA4 (regressao: insert nativo sem legacy_id segue verde).
// ASCII puro. Codigo EN, comentarios PT-BR.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { sql } from 'drizzle-orm';
import { getTableColumns } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/mysql-core';
import type { AnyMySqlTable } from 'drizzle-orm/mysql-core';

import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import * as schema from '#src/modules/budget-plans/adapters/persistence/schemas/mysql.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = mysqlTestConnectionString();

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// ── As 6 tabelas-alvo do ticket (objeto Drizzle + nome fisico). ──────────────
type TargetTable = Readonly<{ dbName: string; table: AnyMySqlTable }>;

const TARGET_TABLES: readonly TargetTable[] = [
  { dbName: 'bgp_budget_plans', table: schema.budgetPlans },
  { dbName: 'bgp_budgets', table: schema.budgets },
  { dbName: 'bgp_cost_centers', table: schema.costCenters },
  { dbName: 'bgp_categories', table: schema.categories },
  { dbName: 'bgp_subcategories', table: schema.subcategories },
  { dbName: 'bgp_budget_results', table: schema.budgetResults },
];

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL (sempre roda) — CA1 no nivel do schema Drizzle.
//    RED ate a coluna + UNIQUE existirem no schema mysql.ts.
// ─────────────────────────────────────────────────────────────────────────────
type ColumnShape = Readonly<{ name: string; columnType: string; notNull: boolean }>;

describe('BGP-ETL-LEGACY-ID — legacy_id + UNIQUE nas 6 tabelas bgp_* (schema Drizzle)', () => {
  for (const { dbName, table } of TARGET_TABLES) {
    describe(dbName, () => {
      it('expoe a coluna legacy_id como INT nullable', () => {
        const cols = getTableColumns(table) as Record<string, ColumnShape | undefined>;
        const col = cols['legacyId'];
        assert.ok(col !== undefined, `${dbName}: coluna legacyId ausente no schema Drizzle`);
        assert.equal(col.name, 'legacy_id', `${dbName}: nome fisico deve ser legacy_id`);
        assert.equal(col.columnType, 'MySqlInt', `${dbName}: legacy_id deve ser INT`);
        assert.equal(col.notNull, false, `${dbName}: legacy_id deve ser NULL (nullable)`);
      });

      it('declara UNIQUE index de coluna unica sobre legacy_id', () => {
        const cfg = getTableConfig(table);
        // `IndexColumn` e' `Column | SQL`; so a Column tem `.name`. Narrow via cast defensivo.
        const uq = cfg.indexes.find((ix) => {
          if (ix.config.unique !== true || ix.config.columns.length !== 1) return false;
          const first = ix.config.columns[0] as { name?: string } | undefined;
          return first?.name === 'legacy_id';
        });
        assert.ok(
          uq !== undefined,
          `${dbName}: UNIQUE index em legacy_id ausente no schema Drizzle`,
        );
      });
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRACAO (opt-in MYSQL_INTEGRATION=1) — CAs contra MySQL real.
// ─────────────────────────────────────────────────────────────────────────────
if (integrationEnabled()) {
  // UUIDs fixos da cadeia de FKs (pai comum a CA2/CA3/CA4).
  const PLAN = '11111111-1111-4111-8111-111111111111';
  const BUDGET = '22222222-2222-4222-8222-222222222222';
  const CC = '33333333-3333-4333-8333-333333333333';
  const CAT = '44444444-4444-4444-8444-444444444444';
  const SUB = '55555555-5555-4555-8555-555555555555';
  const PROG = '66666666-6666-4666-8666-666666666666';
  const PARTNER = '77777777-7777-4777-8777-777777777777';

  let handle: BudgetPlansMysqlHandle | null = null;

  const h = (): BudgetPlansMysqlHandle => {
    if (handle === null) throw new Error('fixture: handle MySQL nao inicializado');
    return handle;
  };

  // Limpeza em ordem FK-segura (filhos antes dos pais; self-ref parent_id nao usado no seed).
  const cleanAll = async (): Promise<void> => {
    const db = h().db;
    await db.execute(sql`DELETE FROM bgp_budget_results`);
    await db.execute(sql`DELETE FROM bgp_subcategories`);
    await db.execute(sql`DELETE FROM bgp_categories`);
    await db.execute(sql`DELETE FROM bgp_cost_centers`);
    await db.execute(sql`DELETE FROM bgp_budgets`);
    await db.execute(sql`DELETE FROM bgp_budget_plans`);
  };

  // Insere a cadeia de pais nativa (SEM legacy_id — colunas existentes).
  const seedChain = async (): Promise<void> => {
    const db = h().db;
    await db.execute(
      sql`INSERT INTO bgp_budget_plans (id, year, program_ref, version_major, version_minor, status, created_at, updated_at)
          VALUES (${PLAN}, 2030, ${PROG}, 1, 0, 'RASCUNHO', NOW(3), NOW(3))`,
    );
    await db.execute(
      sql`INSERT INTO bgp_budgets (id, budget_plan_id, partner_kind, partner_ref)
          VALUES (${BUDGET}, ${PLAN}, 'state', ${PARTNER})`,
    );
    await db.execute(
      sql`INSERT INTO bgp_cost_centers (id, budget_plan_id, name, direction, active)
          VALUES (${CC}, ${PLAN}, 'CC', 'A PAGAR', 1)`,
    );
    await db.execute(
      sql`INSERT INTO bgp_categories (id, cost_center_id, name, active)
          VALUES (${CAT}, ${CC}, 'CAT', 1)`,
    );
    await db.execute(
      sql`INSERT INTO bgp_subcategories (id, category_id, name, launch_type, active)
          VALUES (${SUB}, ${CAT}, 'SUB', 'IPCA', 1)`,
    );
  };

  // Insere UMA linha na tabela-alvo, com chave natural distinta por `discr` (1|2) e o `legacyId`
  // informado (NULL ou numero). `legacy_id` e' interpolado via sql -> vira NULL quando null.
  const insertRow = async (
    dbName: string,
    discr: number,
    legacyId: number | null,
  ): Promise<void> => {
    const db = h().db;
    const id = randomUUID();
    switch (dbName) {
      case 'bgp_budget_plans':
        // version_major=2 evita colidir com o plano seedado (1/0); version_minor=discr distingue.
        await db.execute(
          sql`INSERT INTO bgp_budget_plans (id, year, program_ref, version_major, version_minor, status, created_at, updated_at, legacy_id)
              VALUES (${id}, 2030, ${PROG}, 2, ${discr}, 'RASCUNHO', NOW(3), NOW(3), ${legacyId})`,
        );
        return;
      case 'bgp_budgets':
        // partner_ref distinto por discr -> chave natural (plan, kind, ref) distinta.
        await db.execute(
          sql`INSERT INTO bgp_budgets (id, budget_plan_id, partner_kind, partner_ref, legacy_id)
              VALUES (${id}, ${PLAN}, 'state', ${randomUUID()}, ${legacyId})`,
        );
        return;
      case 'bgp_cost_centers':
        await db.execute(
          sql`INSERT INTO bgp_cost_centers (id, budget_plan_id, name, direction, active, legacy_id)
              VALUES (${id}, ${PLAN}, ${`CC-${discr}`}, 'A PAGAR', 1, ${legacyId})`,
        );
        return;
      case 'bgp_categories':
        await db.execute(
          sql`INSERT INTO bgp_categories (id, cost_center_id, name, active, legacy_id)
              VALUES (${id}, ${CC}, ${`CAT-${discr}`}, 1, ${legacyId})`,
        );
        return;
      case 'bgp_subcategories':
        await db.execute(
          sql`INSERT INTO bgp_subcategories (id, category_id, name, launch_type, active, legacy_id)
              VALUES (${id}, ${CAT}, ${`SUB-${discr}`}, 'IPCA', 1, ${legacyId})`,
        );
        return;
      case 'bgp_budget_results':
        // month=discr distingue a chave natural (budget, subcategory, month).
        await db.execute(
          sql`INSERT INTO bgp_budget_results (id, budget_id, subcategory_id, month, model, value_cents, legacy_id)
              VALUES (${id}, ${BUDGET}, ${SUB}, ${discr}, 'IPCA', 100, ${legacyId})`,
        );
        return;
      default:
        throw new Error(`insertRow: tabela desconhecida ${dbName}`);
    }
  };

  before(async () => {
    const r = await openBudgetPlansMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openBudgetPlansMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await cleanAll();
      await handle.close();
      handle = null;
    }
  });

  // ── CA1 — a coluna existe como INT NULL + UNIQUE em information_schema. ──────
  describe('BGP-ETL-LEGACY-ID · CA1 — legacy_id INT NULL + UNIQUE (information_schema)', () => {
    for (const { dbName } of TARGET_TABLES) {
      it(`${dbName}: legacy_id e' INT e IS_NULLABLE=YES`, async () => {
        const rows = (await h().db.execute(
          sql`SELECT DATA_TYPE AS dataType, IS_NULLABLE AS isNullable
              FROM information_schema.columns
              WHERE table_schema = DATABASE() AND table_name = ${dbName} AND column_name = 'legacy_id'`,
        )) as unknown as [{ dataType: string; isNullable: string }[]];
        const col = rows[0]?.[0];
        assert.ok(col !== undefined, `${dbName}: coluna legacy_id ausente`);
        assert.equal(col.dataType, 'int', `${dbName}: legacy_id deve ser INT`);
        assert.equal(col.isNullable, 'YES', `${dbName}: legacy_id deve ser NULL`);
      });

      it(`${dbName}: existe UNIQUE index sobre legacy_id`, async () => {
        const rows = (await h().db.execute(
          sql`SELECT COUNT(*) AS n
              FROM information_schema.statistics
              WHERE table_schema = DATABASE() AND table_name = ${dbName}
                AND column_name = 'legacy_id' AND non_unique = 0`,
        )) as unknown as [{ n: number }[]];
        const n = rows[0]?.[0]?.n ?? 0;
        assert.ok(n >= 1, `${dbName}: UNIQUE index sobre legacy_id ausente`);
      });
    }
  });

  // ── CA2 — duas linhas nativas (legacy_id NULL) convivem sob o UNIQUE. ───────
  describe('BGP-ETL-LEGACY-ID · CA2 — multiplos NULL convivem (InnoDB)', () => {
    for (const { dbName } of TARGET_TABLES) {
      it(`${dbName}: duas linhas com legacy_id NULL nao violam o UNIQUE`, async () => {
        await cleanAll();
        await seedChain();
        await insertRow(dbName, 1, null);
        await assert.doesNotReject(
          () => insertRow(dbName, 2, null),
          `${dbName}: segundo NULL nao deveria violar o UNIQUE`,
        );
      });
    }
  });

  // ── CA3 — duas linhas com o MESMO legacy_id -> erro de UNIQUE. ──────────────
  describe('BGP-ETL-LEGACY-ID · CA3 — legacy_id duplicado e rejeitado', () => {
    for (const { dbName } of TARGET_TABLES) {
      it(`${dbName}: mesmo legacy_id em duas linhas -> ER_DUP_ENTRY`, async () => {
        await cleanAll();
        await seedChain();
        await insertRow(dbName, 1, 999);
        await assert.rejects(
          () => insertRow(dbName, 2, 999),
          (e: unknown) => {
            // drizzle envolve o erro do mysql2 em DrizzleQueryError; o errno real fica em `cause`
            // (não na message de topo, que é `Failed query: INSERT ...`).
            const cause = (e as { cause?: { errno?: number } }).cause;
            assert.equal(cause?.errno, 1062); // ER_DUP_ENTRY
            return true;
          },
          `${dbName}: legacy_id repetido deveria violar o UNIQUE`,
        );
      });
    }
  });

  // ── CA4 — regressao zero: insert nativo (sem legacy_id) segue verde. ────────
  describe('BGP-ETL-LEGACY-ID · CA4 — regressao: CRUD nativo intacto (aditivo/nullable)', () => {
    it('a cadeia bgp_* nativa insere sem informar legacy_id', async () => {
      await cleanAll();
      await assert.doesNotReject(
        () => seedChain(),
        'seed nativo (sem legacy_id) deve permanecer verde',
      );
      const rows = (await h().db.execute(
        sql`SELECT COUNT(*) AS n FROM bgp_budget_plans WHERE id = ${PLAN}`,
      )) as unknown as [{ n: number }[]];
      assert.equal(rows[0]?.[0]?.n ?? 0, 1, 'o plano nativo deve existir apos o seed');
    });
  });
}
