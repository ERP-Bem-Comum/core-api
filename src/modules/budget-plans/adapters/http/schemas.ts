/**
 * Schemas Zod das rotas de budget-plans (ADR-0027). Zod só na borda.
 *
 * `year` do create valida a faixa 2000-2100 já na borda (espelha a checagem de domínio
 * `budget-plan-invalid-year` — shape inválido aqui vira 400/422 antes de chegar ao use case).
 * O filtro `year` da listagem usa faixa mais larga (1900-2200, precedente partners
 * `yearOfContract`): consultar ano sem plano é legítimo; o bound existe só para vedar
 * overflow/notação científica na coerção da querystring.
 * Paginação harmonizada com contracts/partners (`limit` min 1 max 100).
 */

import * as z from 'zod/v4';

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;

const YEAR_FILTER_MIN = 1900;
const YEAR_FILTER_MAX = 2200;

const LIST_LIMIT_MAX = 100;
const LIST_LIMIT_DEFAULT = 20;

const budgetPlanStatusSchema = z.enum(['RASCUNHO', 'EM_CALIBRACAO', 'APROVADO']);

/** Body do POST /budget-plans. */
export const createBudgetPlanBodySchema = z.object({
  year: z.number().int().min(YEAR_MIN).max(YEAR_MAX),
  programRef: z.uuid(),
});

export type CreateBudgetPlanBody = z.infer<typeof createBudgetPlanBodySchema>;

/** Query do GET /budget-plans (page/limit/year/status/programRef). */
export const listBudgetPlansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(LIST_LIMIT_MAX).default(LIST_LIMIT_DEFAULT),
  year: z.coerce.number().int().min(YEAR_FILTER_MIN).max(YEAR_FILTER_MAX).optional(),
  status: budgetPlanStatusSchema.optional(),
  programRef: z.uuid().optional(),
});

export type ListBudgetPlansQuery = z.infer<typeof listBudgetPlansQuerySchema>;

/** Param `:id` — UUID v4 do plano orçamentário. */
export const budgetPlanIdParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID v4 do plano orçamentário' }),
});

/** Item da listagem (GET /budget-plans). */
export const budgetPlanListItemSchema = z.object({
  id: z.uuid(),
  year: z.number().int(),
  status: budgetPlanStatusSchema,
  version: z.string(),
  programRef: z.uuid(),
  programName: z.string(),
  totalInCents: z.number().int(),
  updatedAt: z.string(),
});

export type BudgetPlanListItemDto = z.infer<typeof budgetPlanListItemSchema>;

/** Response do GET /budget-plans — envelope simples `{ items, total }` (sem meta paginada). */
export const budgetPlanListResponseSchema = z.object({
  items: z.array(budgetPlanListItemSchema),
  total: z.number().int().nonnegative(),
});

export type BudgetPlanListResponseDto = z.infer<typeof budgetPlanListResponseSchema>;

/** Item de orçamento por Rede (parte do detalhe). */
export const budgetDetailItemSchema = z.object({
  id: z.uuid(),
  partner: z.object({
    kind: z.enum(['state', 'municipality']),
    ref: z.uuid(),
  }),
  valueInCents: z.number().int(),
});

/** Detalhe completo (GET /budget-plans/:id). */
export const budgetPlanDetailSchema = z.object({
  id: z.uuid(),
  year: z.number().int(),
  status: budgetPlanStatusSchema,
  version: z.string(),
  programRef: z.uuid(),
  programName: z.string(),
  budgets: z.array(budgetDetailItemSchema),
  totalInCents: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type BudgetPlanDetailDto = z.infer<typeof budgetPlanDetailSchema>;

/** Response do GET /budget-plans/options — insumos da tela de criação. */
export const budgetPlanOptionsSchema = z.object({
  programs: z.array(
    z.object({
      ref: z.uuid(),
      name: z.string(),
      abbreviation: z.string(),
    }),
  ),
  years: z.array(z.number().int()),
  redes: z.array(
    z.object({
      kind: z.enum(['state', 'municipality']),
      ref: z.uuid(),
      name: z.string(),
      uf: z.string(),
    }),
  ),
});

export type BudgetPlanOptionsDto = z.infer<typeof budgetPlanOptionsSchema>;

/** Response do POST /budget-plans. */
export const createBudgetPlanResponseSchema = z.object({
  id: z.uuid(),
  year: z.number().int(),
  programRef: z.uuid(),
  status: budgetPlanStatusSchema,
  version: z.string(),
  totalInCents: z.number().int(),
});

export type CreateBudgetPlanResponseDto = z.infer<typeof createBudgetPlanResponseSchema>;

// ─── Árvore de custos (Fatia 2/US2, BDG-COST-STRUCTURE) ──────────────────────────────
// Valores de fio idênticos ao domínio (cost-direction.ts / launch-type.ts). Zod só na borda:
// o domínio recebe a string crua e re-valida via `parse` (invalid-direction/launch-type -> 422).
const costDirectionSchema = z
  .enum(['A PAGAR', 'A RECEBER'])
  .meta({ description: 'Direcionamento do centro de custo' });
const launchTypeSchema = z
  .enum(['IPCA', 'CAED', 'DESPESAS_PESSOAIS', 'DESPESAS_LOGISTICAS'])
  .meta({ description: 'Modelo de lançamento da subcategoria' });

// Teto de `name` casado com a coluna `varchar(255)` das 3 tabelas bgp_* — barra input
// ilimitado na borda antes de persistir (molde de financial/contracts).
const NODE_NAME_MAX = 255;

/** Body do POST .../cost-structure/cost-centers. */
export const addCostCenterBodySchema = z.object({
  name: z.string().min(1).max(NODE_NAME_MAX),
  direction: costDirectionSchema,
});

export type AddCostCenterBody = z.infer<typeof addCostCenterBodySchema>;

/** Body do POST .../cost-structure/categories. */
export const addCategoryBodySchema = z.object({
  costCenterId: z.uuid(),
  name: z.string().min(1).max(NODE_NAME_MAX),
});

export type AddCategoryBody = z.infer<typeof addCategoryBodySchema>;

/** Body do POST .../cost-structure/subcategories. */
export const addSubcategoryBodySchema = z.object({
  categoryId: z.uuid(),
  name: z.string().min(1).max(NODE_NAME_MAX),
  launchType: launchTypeSchema,
});

export type AddSubcategoryBody = z.infer<typeof addSubcategoryBodySchema>;

// Response: árvore FIXA de 3 níveis (cost-center -> category -> subcategory).
const subcategoryNodeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  launchType: launchTypeSchema,
});

const categoryNodeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  subcategories: z.array(subcategoryNodeSchema),
});

const costCenterNodeSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  direction: costDirectionSchema,
  categories: z.array(categoryNodeSchema),
});

/** Response (GET árvore + 201 dos 3 POSTs): a árvore inteira após a operação. */
export const costStructureTreeSchema = z.object({
  budgetPlanId: z.uuid(),
  costCenters: z.array(costCenterNodeSchema),
});

export type CostStructureTreeDto = z.infer<typeof costStructureTreeSchema>;
