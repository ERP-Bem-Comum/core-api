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

// ─── ciclo de vida (US4) ─────────────────────────────────────────────────────
/** Body do POST /budget-plans/:id/scenery — nome do cenário. */
export const sceneryBodySchema = z.object({
  name: z.string().trim().min(1).max(255).meta({ description: 'Nome do cenário' }),
});

/** Resposta das transições (start-calibration/scenery/approve): o plano resultante + árvore. */
export const lifecyclePlanResponseSchema = z.object({
  id: z.uuid(),
  year: z.number().int(),
  programRef: z.uuid(),
  status: budgetPlanStatusSchema,
  version: z.string(),
  scenarioName: z.string().nullable(),
  parentId: z.uuid().nullable(),
  totalInCents: z.number().int(),
});

export type SceneryBody = z.infer<typeof sceneryBodySchema>;
export type LifecyclePlanResponseDto = z.infer<typeof lifecyclePlanResponseSchema>;

const yearTotalSchema = z.object({ year: z.number().int(), totalInCents: z.number().int() });

/** Resposta do GET /budget-plans/:id/insights (CA3): total do plano vs. anos anteriores. */
export const budgetPlanInsightsResponseSchema = z.object({
  current: yearTotalSchema,
  previousYears: z.array(yearTotalSchema),
});

export type BudgetPlanInsightsResponseDto = z.infer<typeof budgetPlanInsightsResponseSchema>;

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

// ─── budget-results (US3/#317) ───────────────────────────────────────────────
// Cada modelo é uma rota própria (o `model` é fixado pela rota, como o releaseType do legado);
// o body traz só os campos de cálculo. Chaves desconhecidas (ex.: `justification` do legado) são
// descartadas (z.object default = strip).
//
// ⚠️ Bounds são de SANIDADE DE NEGÓCIO por campo — NÃO garantem, sozinhos, ausência de overflow: os
// campos alimentam PRODUTOS (logística multiplica 4 fatores), e nenhum teto por-campo único cabe em
// todas as aridades (revisão zod-expert, 004-code-review). O overflow real (resultado > MAX_SAFE_INTEGER)
// é barrado no domínio por `Money.fromCents` (`money-exceeds-safe-integer`), mapeado a 422 no plugin.
const MAX_CENTS = 10_000_000_000; // R$ 100 mi (valor unitário)
const MAX_COUNT = 100_000;
const MAX_PERCENT = 1_000;

const centsField = z.number().int().min(0).max(MAX_CENTS);
const countField = z.number().int().min(0).max(MAX_COUNT);
const percentField = z.number().min(0).max(MAX_PERCENT);
// IPCA aceita valor negativo (deflação — histórico IBGE); o domínio barra só se o resultado final < 0.
const ipcaField = z.number().min(-100).max(MAX_PERCENT);

const budgetResultTargetSchema = z.object({
  budgetId: z.uuid(),
  subcategoryId: z.uuid(),
});

/** POST /budget-results/ipca — baseValueInCents * (1 + ipca/100). */
export const ipcaBudgetResultBodySchema = budgetResultTargetSchema.extend({
  baseValueInCents: centsField,
  ipca: ipcaField.meta({ description: 'IPCA em % (aceita negativo — deflação)' }),
});

/** POST /budget-results/caed — numberOfEnrollments * baseValueInCents (unitário). */
export const caedBudgetResultBodySchema = budgetResultTargetSchema.extend({
  numberOfEnrollments: countField,
  baseValueInCents: centsField.meta({ description: 'Valor unitário em centavos' }),
});

/** POST /budget-results/personal-expenses — folha (NÃO multiplica por quantidade — metadado). */
export const personalExpensesBudgetResultBodySchema = budgetResultTargetSchema.extend({
  salaryInCents: centsField,
  salaryAdjustment: percentField.meta({ description: 'Reajuste salarial em %' }),
  inssEmployer: percentField.meta({ description: 'INSS patronal em % sobre o salário ajustado' }),
  inss: percentField.meta({ description: 'INSS em % sobre o salário ajustado' }),
  fgtsCharges: percentField.meta({ description: 'Encargos de FGTS em %' }),
  pisCharges: percentField.meta({ description: 'PIS em %' }),
  foodVoucherInCents: centsField,
  transportationVouchersInCents: centsField,
  healthInsuranceInCents: centsField,
  lifeInsuranceInCents: centsField,
  holidaysAndChargesInCents: centsField,
  allowanceInCents: centsField,
  thirteenthInCents: centsField,
  fgtsInCents: centsField,
});

/** POST /budget-results/logistics-expenses — viagem. */
export const logisticsExpensesBudgetResultBodySchema = budgetResultTargetSchema.extend({
  numberOfPeople: countField,
  totalTrips: countField,
  airfareInCents: centsField.meta({
    description: 'Passagem em centavos — NÃO multiplica por diária',
  }),
  dailyAccommodation: countField.meta({ description: 'Nº de diárias de hospedagem' }),
  accommodationInCents: centsField.meta({ description: 'Hospedagem por diária, em centavos' }),
  dailyFood: countField.meta({ description: 'Nº de diárias de alimentação' }),
  foodInCents: centsField.meta({ description: 'Alimentação por diária, em centavos' }),
  dailyTransport: countField.meta({ description: 'Nº de diárias de transporte' }),
  transportInCents: centsField.meta({ description: 'Transporte por diária, em centavos' }),
  dailyCarAndFuel: countField.meta({ description: 'Nº de diárias de carro/combustível' }),
  carAndFuelInCents: centsField.meta({
    description: 'Carro e combustível por diária, em centavos',
  }),
});

/** Response 201 dos POSTs de lançamento: o resultado calculado (valor em centavos). */
export const budgetResultResponseSchema = z.object({
  id: z.uuid(),
  budgetId: z.uuid(),
  subcategoryId: z.uuid(),
  model: launchTypeSchema,
  valueInCents: z.number().int(),
});

/** Param do GET por orçamento (CA3). */
export const budgetResultByBudgetParamSchema = z.object({
  budgetId: z.uuid().meta({ description: 'UUID v4 do orçamento (Rede)' }),
});

/** Response do GET por orçamento: lançamentos + soma (base de "Calculando Gastos"). */
export const budgetResultsListResponseSchema = z.object({
  items: z.array(budgetResultResponseSchema),
  totalInCents: z.number().int(),
});

export type BudgetResultsListDto = z.infer<typeof budgetResultsListResponseSchema>;
export type IpcaBudgetResultBody = z.infer<typeof ipcaBudgetResultBodySchema>;
export type CaedBudgetResultBody = z.infer<typeof caedBudgetResultBodySchema>;
export type PersonalExpensesBudgetResultBody = z.infer<
  typeof personalExpensesBudgetResultBodySchema
>;
export type LogisticsExpensesBudgetResultBody = z.infer<
  typeof logisticsExpensesBudgetResultBodySchema
>;
export type BudgetResultResponseDto = z.infer<typeof budgetResultResponseSchema>;

// ─── budgets (orçamento por Rede — parte 1/US3) ──────────────────────────────
const partnerKindSchema = z
  .enum(['state', 'municipality'])
  .meta({ description: 'Rede: estado (state) XOR município (municipality)' });

// Teto do TOTAL alocado a uma Rede inteira — grandeza distinta do valor unitário de linha
// (`centsField`); não é multiplicado por outros fatores (vai direto a Money.fromCents).
const BUDGET_TOTAL_MAX_CENTS = 1_000_000_000_000; // R$ 10 bi
const budgetTotalCentsField = z.number().int().min(0).max(BUDGET_TOTAL_MAX_CENTS);

/** POST /budget-plans/:id/budgets — adiciona um orçamento por Rede ao plano. */
export const addBudgetBodySchema = z.object({
  partnerKind: partnerKindSchema,
  partnerRef: z
    .uuid()
    .meta({ description: 'UUID do parceiro — estado ou município conforme partnerKind' }),
  valueInCents: budgetTotalCentsField,
});

/** Response 201 do POST budget — mesma forma aninhada de `budgetDetailItemSchema` (partner:{kind,ref}). */
export const budgetResponseSchema = z.object({
  id: z.uuid(),
  partner: z.object({ kind: partnerKindSchema, ref: z.uuid() }),
  valueInCents: z.number().int(),
});

/** Param do DELETE /budget-plans/:id/budgets/:budgetId (CA4). */
export const budgetDeleteParamSchema = z.object({
  id: z.uuid().meta({ description: 'UUID v4 do plano orçamentário' }),
  budgetId: z.uuid().meta({ description: 'UUID v4 do orçamento (Rede)' }),
});

export type AddBudgetBody = z.infer<typeof addBudgetBodySchema>;
export type BudgetResponseDto = z.infer<typeof budgetResponseSchema>;
