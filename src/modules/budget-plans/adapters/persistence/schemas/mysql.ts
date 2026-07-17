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
  boolean,
  char,
  check,
  datetime,
  foreignKey,
  index,
  int,
  mysqlTable,
  smallint,
  tinyint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ─── bgp_budget_plans ───────────────────────────────────────────────────────
// Árvore de planos (US4/#318, legado @Tree): raiz + calibrações/cenários filhos na MESMA tabela.
// `parent_id` (auto-ref) NULL na raiz; `scenario_name` NULL exceto em cenários. FK auto-referente
// `onDelete('restrict')` (W2/drizzle: bgp_budget_plans NÃO é replace-all — é SELECT-then-UPDATE-or-INSERT;
// diferente da D1 do #317, aqui a FK intra-módulo é segura e correta).
export const budgetPlans = mysqlTable(
  'bgp_budget_plans',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    year: int('year').notNull(),
    programRef: varchar('program_ref', { length: 36 }).notNull(),
    versionMajor: int('version_major').notNull(),
    versionMinor: int('version_minor').notNull(),
    status: varchar('status', { length: 16 }).notNull(),
    parentId: varchar('parent_id', { length: 36 }), // nullable: raiz = null
    scenarioName: varchar('scenario_name', { length: 255 }), // nullable: só cenários preenchem
    createdAt: datetime('created_at', { mode: 'date', fsp: 3 }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date', fsp: 3 }).notNull(),
    // Autoria da última escrita (BGP-UPDATED-BY-AUDIT/#373). Nullable: linhas legadas
    // (migrations 0000-0004) não têm valor; UUID do usuário (auth), soft FK cross-módulo
    // sem `references()` (ADR-0014) — molde `financial.approvedBy`. Mapper que preenche
    // é fase B do ticket.
    updatedBy: varchar('updated_by', { length: 36 }),
    // Idempotencia da ETL: id da linha no legado (nullable — linha nativa criada na tela nao tem).
    legacyId: int('legacy_id'),
  },
  (t) => [
    check(
      'bgp_budget_plans_status_chk',
      sql`${t.status} IN ('RASCUNHO','EM_CALIBRACAO','APROVADO')`,
    ),
    // Idempotencia da ETL: UNIQUE em legacy_id (multiplos NULL permitidos no InnoDB).
    uniqueIndex('bgp_budget_plans_legacy_id_uq').on(t.legacyId),
    // Unicidade por VERSÃO (US4): pai e filhos compartilham (year, programRef); a versão distingue.
    uniqueIndex('bgp_budget_plans_year_program_ref_version_uq').on(
      t.year,
      t.programRef,
      t.versionMajor,
      t.versionMinor,
    ),
    // Índice: filtro `listPaged({ status })`.
    index('bgp_budget_plans_status_idx').on(t.status),
    // Índice: buscar filhos de um plano (US4 — árvore, alocação de versão, guard cardinalidade).
    // O índice implícito da FK abaixo cobriria, mas mantido explícito para clareza.
    index('bgp_budget_plans_parent_id_idx').on(t.parentId),
    // FK auto-referente: filho aponta para o pai na MESMA tabela. restrict — não há delete de plano.
    foreignKey({
      name: 'bgp_budget_plans_parent_id_fk',
      columns: [t.parentId],
      foreignColumns: [t.id],
    }).onDelete('restrict'),
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
    // #458 — `value_cents` REMOVIDO: o total por Rede é derivado dos bgp_budget_results. A coluna
    // era o `valueInCents` informado, uma segunda fonte de verdade que a P.O. decidiu não existir
    // (o legado nunca a escrevia). Orçamento = plano + Rede.
    // Idempotencia da ETL: id da linha no legado (nullable — linha nativa criada na tela nao tem).
    legacyId: int('legacy_id'),
  },
  (t) => [
    check('bgp_budgets_partner_kind_chk', sql`${t.partnerKind} IN ('state','municipality')`),
    // Idempotencia da ETL: UNIQUE em legacy_id (multiplos NULL permitidos no InnoDB).
    uniqueIndex('bgp_budgets_legacy_id_uq').on(t.legacyId),
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
    // #454 gap 3 — intenção do PRÓPRIO nó (soft). O efetivo (nó ∧ ancestrais) é derivado na
    // leitura: gravar o efetivo aqui apagaria quem foi desativado à mão. DEFAULT TRUE: nó
    // existente nasce ativo. Molde: par_partners.active.
    active: boolean('active').notNull().default(true),
    // Idempotencia da ETL: id da linha no legado (nullable — linha nativa criada na tela nao tem).
    legacyId: int('legacy_id'),
  },
  (t) => [
    check('bgp_cost_centers_direction_chk', sql`${t.direction} IN ('A PAGAR','A RECEBER')`),
    // Idempotencia da ETL: UNIQUE em legacy_id (multiplos NULL permitidos no InnoDB).
    uniqueIndex('bgp_cost_centers_legacy_id_uq').on(t.legacyId),
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
    // #454 gap 3 — intenção do próprio nó; o efetivo herda do centro na leitura.
    active: boolean('active').notNull().default(true),
    // Idempotencia da ETL: id da linha no legado (nullable — linha nativa criada na tela nao tem).
    legacyId: int('legacy_id'),
  },
  (t) => [
    // Idempotencia da ETL: UNIQUE em legacy_id (multiplos NULL permitidos no InnoDB).
    uniqueIndex('bgp_categories_legacy_id_uq').on(t.legacyId),
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
    // #454 gap 3 — intenção do próprio nó; o efetivo herda de categoria e centro na leitura.
    // Desativar NUNCA apaga: bgp_budget_results.subcategory_id aponta pra cá e não tem FK.
    active: boolean('active').notNull().default(true),
    // Idempotencia da ETL: id da linha no legado (nullable — linha nativa criada na tela nao tem).
    legacyId: int('legacy_id'),
  },
  (t) => [
    // Idempotencia da ETL: UNIQUE em legacy_id (multiplos NULL permitidos no InnoDB).
    uniqueIndex('bgp_subcategories_legacy_id_uq').on(t.legacyId),
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

// ─── bgp_budget_results ─────────────────────────────────────────────────────
// Lançamento calculado (US3/#317) por (budget, subcategoria, MÊS do exercício — #413). Valor
// derivado server-side (fonte única, FR-003). `value_cents` = Money cents (ADR-0020 §"Mapeamentos":
// bigint, nunca decimal/JSON). `model` replica o launchType da subcategoria — VARCHAR+CHECK, sem
// ENUM nativo (ADR-0020 §"Lista normativa"). SEM FK física para bgp_budgets/bgp_subcategories: ambas
// são reescritas por replace-all e BudgetResult é agregado próprio — refs por identidade, molde de
// fin_reconciliation_items.payable_id (ver 001-research/DESIGN-DECISIONS.md D1).
//
// #413 — o mês é LINHA, não coluna: 12 colunas (jan_cents…dez_cents) seria repeating group (viola a
// 1NF), exigiria DDL para mudar o calendário e tiraria `month` do índice. JSON de 12 posições é
// PROIBIDO (ADR-0020 veta JSON nativo). O anual é SUM(value_cents), nunca um valor armazenado.
export const budgetResults = mysqlTable(
  'bgp_budget_results',
  {
    id: varchar('id', { length: 36 }).primaryKey().notNull(),
    budgetId: varchar('budget_id', { length: 36 }).notNull(),
    subcategoryId: varchar('subcategory_id', { length: 36 }).notNull(),
    // Mês do exercício (1..12) — TINYINT basta e sem DEFAULT: greenfield (nenhum ambiente tem plano).
    month: tinyint('month').notNull(),
    model: varchar('model', { length: 24 }).notNull(),
    valueCents: bigint('value_cents', { mode: 'number' }).notNull(),
    // Idempotencia da ETL: id da linha no legado (nullable — linha nativa criada na tela nao tem).
    legacyId: int('legacy_id'),
  },
  (t) => [
    // Idempotencia da ETL: UNIQUE em legacy_id (multiplos NULL permitidos no InnoDB).
    uniqueIndex('bgp_budget_results_legacy_id_uq').on(t.legacyId),
    check(
      'bgp_budget_results_model_chk',
      sql`${t.model} IN ('IPCA','CAED','DESPESAS_PESSOAIS','DESPESAS_LOGISTICAS')`,
    ),
    check('bgp_budget_results_month_chk', sql`${t.month} BETWEEN 1 AND 12`),
    // #413 — identidade de negócio do lançamento. É o que torna o recálculo idempotente
    // (ON DUPLICATE KEY UPDATE) e o que impede a MESMA conta/mês virar 2 linhas — defeito que
    // existia antes desta chave e fazia o total por Rede contar EM DOBRO.
    // Serve também de índice de prefixo para `WHERE budget_id = ?` (query CA3 + delete CA4),
    // por isso o antigo bgp_budget_results_budget_id_idx foi removido: era redundante.
    uniqueIndex('bgp_budget_results_budget_subcategory_month_uq').on(
      t.budgetId,
      t.subcategoryId,
      t.month,
    ),
    // Query CA3 "por subcategoria" (WHERE subcategory_id) — não coberta pelo prefixo do UNIQUE.
    index('bgp_budget_results_subcategory_id_idx').on(t.subcategoryId),
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
export type BudgetResultRow = typeof budgetResults.$inferSelect;
export type NewBudgetResultRow = typeof budgetResults.$inferInsert;
