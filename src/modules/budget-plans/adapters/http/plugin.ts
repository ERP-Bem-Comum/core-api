/**
 * Plugin HTTP do módulo budget-plans (ADR-0006/0025/0027/0037, issue #315).
 *
 * Greenfield → montado sob `/api/v2/budget-plans` (plugin direto, forma legada do buildApp —
 * espelha `financial/adapters/http/plugin.ts`). Zod contract-first (ADR-0027): schemas em
 * schemas.ts, validação na borda, domínio recebe primitivos. RBAC: requireAuth (401) +
 * authorize(permission) (403) por rota.
 *
 * 4 rotas sob `/budget-plans`:
 *   POST /budget-plans          budget-plan:write  → createBudgetPlan (201)
 *   GET  /budget-plans          budget-plan:read   → listBudgetPlans
 *   GET  /budget-plans/options  budget-plan:read   → getBudgetPlanOptions (ANTES de /:id)
 *   GET  /budget-plans/:id      budget-plan:read   → getBudgetPlan
 *
 * Mapa erro->HTTP (000-request.md):
 *   budget-plan-ref-invalid / budget-plan-id-invalid / program-not-active -> 422
 *   program-not-found / budget-plan-not-found                            -> 404
 *   budget-plan-already-exists                                          -> 409
 *   repo/catálogo/outbox indisponível                                    -> 503
 *   body malformado (Zod)                                                -> 400 (error handler central)
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
} from './schemas.ts';
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
};

const writeErrorStatus = (code: string): number => WRITE_ERROR_STATUS[code] ?? 422;

const sendWriteError = (reply: FastifyReply, code: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

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
  };

export const budgetPlansHttpPlugin =
  (deps: BudgetPlansHttpDeps, hooks: BudgetPlansHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(budgetPlansRoutes(deps, hooks));
  };
