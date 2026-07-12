/**
 * Plugin HTTP do módulo budget-plans (ADR-0006/0025/0027/0037, issue #315).
 *
 * Greenfield → montado sob `/api/v2/budget-plans` (plugin direto, forma legada do buildApp —
 * espelha `financial/adapters/http/plugin.ts`). Zod contract-first (ADR-0027): schemas em
 * schemas.ts, validação na borda, domínio recebe primitivos. RBAC: requireAuth (401) +
 * authorize(permission) (403) por rota.
 *
 * Rotas sob `/budget-plans` (cada uma com comentário inline): plano (CRUD — #315), árvore de custos
 * (#316), budget-results + budgets (US3/#317) e ciclo de vida (US4/#318 — start-calibration/scenery/
 * approve/insights). O mapa erro→HTTP canônico é `WRITE_ERROR_STATUS` abaixo (fonte única). Router
 * find-my-way casa segmento estático antes de paramétrico (rotas estáticas coexistem com `/:id`).
 * RBAC: requireAuth (401) + authorize(permission) (403) por rota; body malformado (Zod) → 400.
 */

import type { FastifyPluginAsync, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

import type { ListBudgetPlansInput } from '../../application/use-cases/list-budget-plans.ts';
import type { BudgetPlansHttpDeps } from './composition.ts';
import {
  createBudgetPlanToDto,
  budgetPlanListItemToDto,
  budgetPlanDetailToDto,
  lifecyclePlanToDto,
} from './budget-plan-dto.ts';
import { costStructureToDto } from './cost-structure-dto.ts';
import {
  createBudgetPlanBodySchema,
  listBudgetPlansQuerySchema,
  budgetPlanIdParamSchema,
  budgetPlanListResponseSchema,
  budgetPlanDetailSchema,
  budgetPlanOptionsSchema,
  createBudgetPlanResponseSchema,
  addCostCenterBodySchema,
  addCategoryBodySchema,
  addSubcategoryBodySchema,
  costStructureTreeSchema,
  ipcaBudgetResultBodySchema,
  caedBudgetResultBodySchema,
  personalExpensesBudgetResultBodySchema,
  logisticsExpensesBudgetResultBodySchema,
  budgetResultResponseSchema,
  budgetResultByBudgetParamSchema,
  budgetResultsListResponseSchema,
  addBudgetBodySchema,
  budgetResponseSchema,
  budgetDeleteParamSchema,
  sceneryBodySchema,
  lifecyclePlanResponseSchema,
  budgetPlanChildrenResponseSchema,
  budgetPlanInsightsResponseSchema,
  consolidatedQuerySchema,
  consolidatedResultResponseSchema,
  csvResponse,
} from './schemas.ts';
import { sectionsToCsv } from './budget-plan-csv.ts';
import { budgetResultToDto } from './budget-result-dto.ts';
import { budgetToDto } from './budget-dto.ts';
import { BUDGET_PLAN_PERMISSION } from '../../public-api/permissions.ts';

export type BudgetPlansHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// Erro de escrita/leitura -> status. Default 422 (invariante de domínio/formato de ref).
const WRITE_ERROR_STATUS: Readonly<Record<string, number>> = {
  'budget-plan-ref-invalid': 422,
  'budget-plan-id-invalid': 422,
  'budget-plan-invalid-year': 422,
  'budget-plan-duplicate-partner': 422,
  'program-not-found': 404,
  'program-not-active': 422,
  'budget-plan-already-exists': 409,
  'budget-plan-not-found': 404,
  'budget-plan-repo-unavailable': 503,
  'program-catalog-unavailable': 503,
  'partner-network-unavailable': 503,
  'outbox-append-failed': 503,
  // Árvore de custos (Fatia 2/US2). Plano APROVADO bloqueia escrita -> 409; nó órfão/nome
  // vazio -> 400; direção/lançamento inválidos -> 422; infra da árvore -> 503.
  'budget-plan-not-editable': 409,
  'cost-node-parent-not-found': 400,
  'cost-node-name-required': 400,
  'cost-node-invalid-direction': 422,
  'cost-node-invalid-launch-type': 422,
  'cost-center-id-invalid': 422,
  'category-id-invalid': 422,
  'cost-structure-repo-unavailable': 503,
  // Lançamento calculado (US3/#317). Modelo incompatível com a subcategoria -> 400 (CA2);
  // orçamento/subcategoria ausentes -> 404; overflow/negativo do Money -> 422 (default);
  // infra de repo/reader -> 503.
  'calc-model-mismatch': 400,
  'budget-not-found': 404,
  'subcategory-not-found': 404,
  'budget-id-invalid': 422,
  'subcategory-id-invalid': 422,
  'budget-plan-invalid-money': 422,
  'budget-result-repo-unavailable': 503,
  'budget-result-corrupt': 503,
  'subcategory-reader-unavailable': 503,
  'budget-reader-unavailable': 503,
  // Ciclo de vida (US4). Transição inválida p/ o estado atual -> 409; nome de cenário vazio -> 400.
  'budget-plan-not-approved': 409,
  'budget-plan-is-scenario': 409,
  'budget-plan-already-approved': 409,
  'budget-plan-calibration-open': 409,
  'budget-plan-scenery-limit': 409,
  'scenario-name-required': 400,
  // Consolidado + CSV (US5/#319). Export de plano não-aprovado -> 409 (precondição de estado).
  'plan-not-approved-for-consolidation': 409,
};

const writeErrorStatus = (code: string): number => WRITE_ERROR_STATUS[code] ?? 422;

const sendWriteError = (reply: FastifyReply, code: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

// CSV inline (US5): download síncrono na própria response (sem e-mail/FS, ≠ legado). A string já
// carrega BOM + CRLF (util canônico); `charset=utf-8` + attachment fecham o contrato de download.
const sendCsv = (reply: FastifyReply, csv: string, fileName: string): Promise<void> =>
  reply
    .header('content-type', 'text/csv; charset=utf-8')
    .header('content-disposition', `attachment; filename="${fileName}"`)
    .send(csv) as unknown as Promise<void>;

const budgetPlansRoutes =
  (deps: BudgetPlansHttpDeps, hooks: BudgetPlansHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // POST /budget-plans — criar. 201 + corpo (cabeçalho do plano; budgets nascem vazios).
    scope.route({
      method: 'POST',
      url: '/budget-plans',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        body: createBudgetPlanBodySchema,
        response: { 201: createBudgetPlanResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.createBudgetPlan(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(createBudgetPlanToDto(result.value)), { ok: 201 });
      },
    });

    // GET /budget-plans — lista + filtros (status/programRef/year).
    scope.route({
      method: 'GET',
      url: '/budget-plans',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        querystring: listBudgetPlansQuerySchema,
        response: { 200: budgetPlanListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        // exactOptionalPropertyTypes: só inclui year/status/programRef quando presentes.
        const input: ListBudgetPlansInput = {
          page: q.page,
          limit: q.limit,
          ...(q.year !== undefined ? { year: q.year } : {}),
          ...(q.status !== undefined ? { status: q.status } : {}),
          ...(q.programRef !== undefined ? { programRef: q.programRef } : {}),
        };
        const result = await deps.listBudgetPlans(input);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(
          reply,
          ok({ items: result.value.items.map(budgetPlanListItemToDto), total: result.value.total }),
          { ok: 200 },
        );
      },
    });

    // GET /budget-plans/options — insumos da tela de criação (programas ativos + anos + redes).
    // Registrada ANTES de /budget-plans/:id — rota estática não pode ser sombreada pelo :id.
    scope.route({
      method: 'GET',
      url: '/budget-plans/options',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        response: { 200: budgetPlanOptionsSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.getBudgetPlanOptions();
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });

    // GET /budget-plans/consolidated-result — Consolidado ABC (JSON): total + resumo da vigente
    // aprovada de cada família (Ano × Programa). Segmento estático — find-my-way o prioriza sobre
    // /budget-plans/:id independentemente da ordem de registro.
    scope.route({
      method: 'GET',
      url: '/budget-plans/consolidated-result',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        querystring: consolidatedQuerySchema,
        response: { 200: consolidatedResultResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        const result = await deps.getConsolidatedResult({
          year: q.year,
          ...(q.programRef !== undefined ? { programRef: q.programRef } : {}),
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });

    // GET /budget-plans/consolidated-result/csv — CSV server-side do consolidado, inline (CA2).
    scope.route({
      method: 'GET',
      url: '/budget-plans/consolidated-result/csv',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        querystring: consolidatedQuerySchema,
        response: { 200: csvResponse('Consolidado ABC em CSV (RFC 4180; ; como separador)') },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        const result = await deps.getConsolidatedExport({
          year: q.year,
          ...(q.programRef !== undefined ? { programRef: q.programRef } : {}),
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendCsv(reply, sectionsToCsv(result.value), `consolidado-${q.year}.csv`);
      },
    });

    // GET /budget-plans/:id/generate-csv — CSV server-side de um plano APROVADO, inline (CA3).
    scope.route({
      method: 'GET',
      url: '/budget-plans/:id/generate-csv',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 200: csvResponse('Plano orçamentário em CSV (RFC 4180; ; como separador)') },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getPlanExport({ planId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendCsv(reply, sectionsToCsv([result.value]), `plano-${req.params.id}.csv`);
      },
    });

    // GET /budget-plans/:id — detalhe (cabeçalho + budgets + totalInCents).
    scope.route({
      method: 'GET',
      url: '/budget-plans/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 200: budgetPlanDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getBudgetPlan(req.params.id);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(budgetPlanDetailToDto(result.value)), { ok: 200 });
      },
    });

    // GET /budget-plans/:id/cost-structure — árvore de custos do plano (CA1). Árvore vazia
    // é válida (plano sem nós). Segmento extra evita colisão com /budget-plans/:id.
    scope.route({
      method: 'GET',
      url: '/budget-plans/:id/cost-structure',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 200: costStructureTreeSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getCostStructure(req.params.id);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(costStructureToDto(result.value)), { ok: 200 });
      },
    });

    // GET /budget-plans/:id/children — filhos diretos (cenários/calibrações), ordenados por
    // versão ascendente (#401). Plano sem filhos -> 200 + items:[]; :id inexistente -> 404.
    scope.route({
      method: 'GET',
      url: '/budget-plans/:id/children',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 200: budgetPlanChildrenResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listScenarioChildren(req.params.id);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });

    // POST /budget-plans/:id/cost-structure/cost-centers — adiciona raiz (CA2). 201 + árvore.
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/cost-structure/cost-centers',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        body: addCostCenterBodySchema,
        response: { 201: costStructureTreeSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.addCostCenter({
          budgetPlanId: req.params.id,
          name: req.body.name,
          direction: req.body.direction,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(costStructureToDto(result.value)), { ok: 201 });
      },
    });

    // POST /budget-plans/:id/cost-structure/categories — adiciona categoria a um cost-center (CA2).
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/cost-structure/categories',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        body: addCategoryBodySchema,
        response: { 201: costStructureTreeSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.addCategory({
          budgetPlanId: req.params.id,
          costCenterId: req.body.costCenterId,
          name: req.body.name,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(costStructureToDto(result.value)), { ok: 201 });
      },
    });

    // POST /budget-plans/:id/cost-structure/subcategories — adiciona folha a uma categoria (CA2).
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/cost-structure/subcategories',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        body: addSubcategoryBodySchema,
        response: { 201: costStructureTreeSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.addSubcategory({
          budgetPlanId: req.params.id,
          categoryId: req.body.categoryId,
          name: req.body.name,
          launchType: req.body.launchType,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(costStructureToDto(result.value)), { ok: 201 });
      },
    });

    // POST /budget-plans/budget-results/{modelo} — lança e calcula (US3/CA1+CA2). O `model` é fixado
    // pela rota (como o releaseType do legado); o body traz só os campos do cálculo. 201 + resultado.
    scope.route({
      method: 'POST',
      url: '/budget-plans/budget-results/ipca',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        body: ipcaBudgetResultBodySchema,
        response: { 201: budgetResultResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.addBudgetResult({
          budgetId: req.body.budgetId,
          subcategoryId: req.body.subcategoryId,
          input: {
            kind: 'IPCA',
            baseValueInCents: req.body.baseValueInCents,
            ipca: req.body.ipca,
          },
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(budgetResultToDto(result.value)), { ok: 201 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/budget-plans/budget-results/caed',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        body: caedBudgetResultBodySchema,
        response: { 201: budgetResultResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.addBudgetResult({
          budgetId: req.body.budgetId,
          subcategoryId: req.body.subcategoryId,
          input: {
            kind: 'CAED',
            numberOfEnrollments: req.body.numberOfEnrollments,
            baseValueInCents: req.body.baseValueInCents,
          },
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(budgetResultToDto(result.value)), { ok: 201 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/budget-plans/budget-results/personal-expenses',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        body: personalExpensesBudgetResultBodySchema,
        response: { 201: budgetResultResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const b = req.body;
        const result = await deps.addBudgetResult({
          budgetId: b.budgetId,
          subcategoryId: b.subcategoryId,
          input: {
            kind: 'DESPESAS_PESSOAIS',
            salaryInCents: b.salaryInCents,
            salaryAdjustment: b.salaryAdjustment,
            inssEmployer: b.inssEmployer,
            inss: b.inss,
            fgtsCharges: b.fgtsCharges,
            pisCharges: b.pisCharges,
            foodVoucherInCents: b.foodVoucherInCents,
            transportationVouchersInCents: b.transportationVouchersInCents,
            healthInsuranceInCents: b.healthInsuranceInCents,
            lifeInsuranceInCents: b.lifeInsuranceInCents,
            holidaysAndChargesInCents: b.holidaysAndChargesInCents,
            allowanceInCents: b.allowanceInCents,
            thirteenthInCents: b.thirteenthInCents,
            fgtsInCents: b.fgtsInCents,
          },
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(budgetResultToDto(result.value)), { ok: 201 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/budget-plans/budget-results/logistics-expenses',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        body: logisticsExpensesBudgetResultBodySchema,
        response: { 201: budgetResultResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const b = req.body;
        const result = await deps.addBudgetResult({
          budgetId: b.budgetId,
          subcategoryId: b.subcategoryId,
          input: {
            kind: 'DESPESAS_LOGISTICAS',
            numberOfPeople: b.numberOfPeople,
            totalTrips: b.totalTrips,
            airfareInCents: b.airfareInCents,
            dailyAccommodation: b.dailyAccommodation,
            accommodationInCents: b.accommodationInCents,
            dailyFood: b.dailyFood,
            foodInCents: b.foodInCents,
            dailyTransport: b.dailyTransport,
            transportInCents: b.transportInCents,
            dailyCarAndFuel: b.dailyCarAndFuel,
            carAndFuelInCents: b.carAndFuelInCents,
          },
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(budgetResultToDto(result.value)), { ok: 201 });
      },
    });

    // GET /budget-plans/budget-results/by-budget/:budgetId — lançamentos + soma do orçamento (CA3).
    // Router find-my-way casa segmento estático (`by-budget`) antes de paramétrico, e o param `:id`
    // de /budget-plans/:id é `z.uuid()` (rejeita "budget-results" com 400) — sem ambiguidade real.
    scope.route({
      method: 'GET',
      url: '/budget-plans/budget-results/by-budget/:budgetId',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        params: budgetResultByBudgetParamSchema,
        response: { 200: budgetResultsListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getBudgetResults(req.params.budgetId);
        if (!result.ok) return sendWriteError(reply, result.error);
        const items = result.value.items.map(budgetResultToDto);
        // Total somado no domínio (Money.add) — a borda só serializa os centavos.
        return sendResult(reply, ok({ items, totalInCents: result.value.total.cents }), {
          ok: 200,
        });
      },
    });

    // POST /budget-plans/:id/budgets — adiciona um orçamento por Rede ao plano (parte 1/US3). 201.
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/budgets',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        body: addBudgetBodySchema,
        response: { 201: budgetResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.addBudget({
          budgetPlanId: req.params.id,
          partnerKind: req.body.partnerKind,
          partnerRef: req.body.partnerRef,
          valueInCents: req.body.valueInCents,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(budgetToDto(result.value)), { ok: 201 });
      },
    });

    // DELETE /budget-plans/:id/budgets/:budgetId — remove o orçamento + resultados dependentes (CA4). 204.
    scope.route({
      method: 'DELETE',
      url: '/budget-plans/:id/budgets/:budgetId',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetDeleteParamSchema,
        // 204 sem body → sem response schema (convenção das rotas 204 deste projeto).
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.deleteBudget({
          budgetPlanId: req.params.id,
          budgetId: req.params.budgetId,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(204).send() as unknown as Promise<void>;
      },
    });

    // POST /budget-plans/:id/start-calibration — deriva calibração (filho EM_CALIBRACAO) do APROVADO (CA1).
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/start-calibration',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 201: lifecyclePlanResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.startCalibration({ parentPlanId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(lifecyclePlanToDto(result.value.plan)), { ok: 201 });
      },
    });

    // POST /budget-plans/:id/scenery — deriva cenário (filho RASCUNHO nomeado) de plano não-aprovado (CA4).
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/scenery',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        body: sceneryBodySchema,
        response: { 201: lifecyclePlanResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.createScenery({
          parentPlanId: req.params.id,
          name: req.body.name,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(lifecyclePlanToDto(result.value.plan)), { ok: 201 });
      },
    });

    // POST /budget-plans/:id/approve — aprova o plano (→ APROVADO; bloqueia edição) (CA2).
    scope.route({
      method: 'POST',
      url: '/budget-plans/:id/approve',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.write)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 200: lifecyclePlanResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.approveBudgetPlan({ planId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(lifecyclePlanToDto(result.value.plan)), { ok: 200 });
      },
    });

    // GET /budget-plans/:id/insights — comparação ano-a-ano dos totais planejados (CA3).
    scope.route({
      method: 'GET',
      url: '/budget-plans/:id/insights',
      preHandler: [hooks.requireAuth, hooks.authorize(BUDGET_PLAN_PERMISSION.read)],
      schema: {
        params: budgetPlanIdParamSchema,
        response: { 200: budgetPlanInsightsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getBudgetPlanInsights(req.params.id);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });
  };

export const budgetPlansHttpPlugin =
  (deps: BudgetPlansHttpDeps, hooks: BudgetPlansHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(budgetPlansRoutes(deps, hooks));
  };
