// Schema Drizzle (mysql-core) do módulo budget-plans. Prefixo `bgp_*` (ADR-0014).
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual na migration (drizzle-orm 0.45.x não
// expõe charset/collate table-level):
//   - Por tabela: `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//   - Em colunas UUID (`id`, `program_ref`, `budget_plan_id`, `partner_ref`,
//     `event_id`/`aggregate_id` do outbox): `COLLATE utf8mb4_bin`
//
// ADR-0020: sem JSON nativo (payload do outbox é varchar), sem ENUM (status/kind via
// varchar + CHECK), sem AUTO_INCREMENT em PK de domínio (id é UUID v4 do domínio).
// `program_ref`/`partner_ref` são soft FKs cross-módulo (ADR-0014) — sem `references()`,
// validados no domínio via rehydrate (`ProgramRef`, `PartnerStateRef`/`PartnerMunicipalityRef`).

import {
  bigint,
  char,
  check,
  datetime,
  foreignKey,
  index,
  int,
  mysqlTable,
  smallint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ─── bgp_budget_plans ───────────────────────────────────────────────────────
// Agregado raiz. Plano orçamentário único por (year, programRef) — cenários/calibrações
// filhas (Fatia 4) não entram nesta tabela; quando existirem, este UNIQUE será revisto.
export const budgetPlans = mysqlTable(
  'bgp_budget_plans',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    year: int('year').notNull(),
    programRef: varchar('program_ref', { length: 36 }).notNull(),
    versionMajor: int('version_major').notNull(),
    versionMinor: int('version_minor').notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
  },
  (t) => [
    check(
      'bgp_budget_plans_status_chk',
      sql`${t.status} IN ('RASCUNHO','EM_CALIBRACAO','APROVADO')`,
    ),
    // Invariante do domínio (BudgetPlan.create): plano raiz único por Ano+Programa.
    // Cobre também `WHERE year = ?` isolado (leftmost prefix) — sem índice extra.
    uniqueIndex('bgp_budget_plans_year_program_ref_uq').on(t.year, t.programRef),
    // Índice: filtro `listPaged({ status })`.
    index('bgp_budget_plans_status_idx').on(t.status),
  ],
);

// ─── bgp_budgets ────────────────────────────────────────────────────────────
// Entidade filha do agregado — orçamento por Rede (estado XOR município parceiro,
// módulo partners). Reescrita por inteiro (delete+insert) a cada `save` do plano —
// molde do repo (SELECT-then-UPDATE-or-INSERT do header + replace dos filhos).
export const budgets = mysqlTable(
  'bgp_budgets',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    budgetPlanId: varchar('budget_plan_id', { length: 36 }).notNull(),
    partnerKind: varchar('partner_kind', { length: 16 }).notNull(),
    partnerRef: varchar('partner_ref', { length: 36 }).notNull(),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
  },
  (t) => [
    check('bgp_budgets_partner_kind_chk', sql`${t.partnerKind} IN ('state','municipality')`),
    // Invariante do domínio (BudgetPlan.addBudget): no máx. 1 orçamento por parceiro
    // dentro do plano. Leftmost prefix (budget_plan_id) também cobre a FK abaixo —
    // sem índice single-column redundante.
    uniqueIndex('bgp_budgets_budget_plan_id_partner_kind_partner_ref_uq').on(
      t.budgetPlanId,
      t.partnerKind,
      t.partnerRef,
    ),
    // FK intra-módulo (ON DELETE CASCADE — boundary do agregado, molde fin_payables).
    foreignKey({
      name: 'bgp_budgets_budget_plan_id_fk',
      columns: [t.budgetPlanId],
      foreignColumns: [budgetPlans.id],
    }).onDelete('cascade'),
  ],
);

// ─── bgp_outbox ─────────────────────────────────────────────────────────────
// Espelho exato de `prg_outbox` (ADR-0015).
export const bgpOutbox = mysqlTable(
  'bgp_outbox',
  {
    eventId: char('event_id', { length: 36 }).primaryKey().notNull(),
    aggregateId: char('aggregate_id', { length: 36 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    attempts: smallint('attempts').notNull().default(0),
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    check('bgp_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    check('bgp_outbox_event_type_nonempty_chk', sql`CHAR_LENGTH(${t.eventType}) > 0`),
    check('bgp_outbox_aggregate_type_chk', sql`${t.aggregateType} IN ('BudgetPlan')`),
    index('bgp_outbox_processed_at_occurred_at_idx').on(t.processedAt, t.occurredAt),
    index('bgp_outbox_aggregate_id_idx').on(t.aggregateId),
  ],
);

// ─── bgp_cost_centers ───────────────────────────────────────────────────────
// Raiz da árvore de custos (Fatia 2/US2). Adjacency por FK (3 tabelas tipadas por
// nível), NÃO tabela única auto-referenciada. `direction` (A PAGAR/A RECEBER) só
// existe na raiz. Reescrita por inteiro (replace-all) a cada `save` da estrutura.
export const costCenters = mysqlTable(
  'bgp_cost_centers',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    budgetPlanId: varchar('budget_plan_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    direction: varchar('direction', { length: 16 }).notNull(),
  },
  (t) => [
    check('bgp_cost_centers_direction_chk', sql`${t.direction} IN ('A PAGAR','A RECEBER')`),
    // FK intra-módulo → agregado raiz (ON DELETE CASCADE — apaga a árvore quando o plano cai).
    // O índice implícito da FK já cobre `findByBudgetPlanId` (WHERE budget_plan_id) — sem índice redundante.
    foreignKey({
      name: 'bgp_cost_centers_budget_plan_id_fk',
      columns: [t.budgetPlanId],
      foreignColumns: [budgetPlans.id],
    }).onDelete('cascade'),
  ],
);

// ─── bgp_categories ─────────────────────────────────────────────────────────
// Nível intermediário. Sem `direction`/`launch_type` (herdados só na raiz/folha).
export const categories = mysqlTable(
  'bgp_categories',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    costCenterId: varchar('cost_center_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
  },
  (t) => [
    // O índice implícito da FK já cobre a reconstrução (`WHERE cost_center_id IN (...)`) — sem índice redundante.
    foreignKey({
      name: 'bgp_categories_cost_center_id_fk',
      columns: [t.costCenterId],
      foreignColumns: [costCenters.id],
    }).onDelete('cascade'),
  ],
);

// ─── bgp_subcategories ──────────────────────────────────────────────────────
// Folha da árvore. `launch_type` (modelo de lançamento, US3) só existe aqui.
export const subcategories = mysqlTable(
  'bgp_subcategories',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    categoryId: varchar('category_id', { length: 36 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    launchType: varchar('launch_type', { length: 24 }).notNull(),
  },
  (t) => [
    check(
      'bgp_subcategories_launch_type_chk',
      sql`${t.launchType} IN ('IPCA','CAED','DESPESAS_PESSOAIS','DESPESAS_LOGISTICAS')`,
    ),
    // O índice implícito da FK já cobre a reconstrução (`WHERE category_id IN (...)`) — sem índice redundante.
    foreignKey({
      name: 'bgp_subcategories_category_id_fk',
      columns: [t.categoryId],
      foreignColumns: [categories.id],
    }).onDelete('cascade'),
  ],
);

export type BudgetPlanRow = typeof budgetPlans.$inferSelect;
export type NewBudgetPlanRow = typeof budgetPlans.$inferInsert;
export type BudgetRow = typeof budgets.$inferSelect;
export type NewBudgetRow = typeof budgets.$inferInsert;
export type BgpOutboxRow = typeof bgpOutbox.$inferSelect;
export type NewBgpOutboxRow = typeof bgpOutbox.$inferInsert;
export type CostCenterRow = typeof costCenters.$inferSelect;
export type NewCostCenterRow = typeof costCenters.$inferInsert;
export type CategoryRow = typeof categories.$inferSelect;
export type NewCategoryRow = typeof categories.$inferInsert;
export type SubcategoryRow = typeof subcategories.$inferSelect;
export type NewSubcategoryRow = typeof subcategories.$inferInsert;
