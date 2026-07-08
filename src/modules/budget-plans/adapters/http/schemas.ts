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
