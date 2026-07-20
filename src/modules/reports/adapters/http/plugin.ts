/**
 * Plugin HTTP do módulo Reports (ADR-0006/0025/0027/0033). Encapsula `/reports`; registrado
 * DIRETO pelo root sob `/api/v2` (greenfield). Espelha `programs/adapters/http/plugin.ts`.
 *
 * Rotas:
 *  - GET /reports/team — projeção "Equipe ABC" (13 colunas: as 10 do REP-1 · #238 +
 *    genderIdentity/race/age do REPORTS-TEAM-DEMOGRAPHIC-COLUMNS).
 *  - GET /reports/team/demographics — 3 distribuições demográficas agregadas (REP-1 · sensível).
 *  - GET /reports/suppliers-without-contract — agregação de payables sem contrato (REP-2 · #240).
 *  - GET /reports/payment-position — posição de pagamentos por fornecedor×CC×categoria (REP-4 · #243).
 *  - GET /reports/analysis/payables + /reports/analysis/chart — análise de planejamento (REP-3 · #114).
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { COLLABORATOR_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';
import { FINANCIAL_PERMISSION } from '#src/modules/financial/public-api/permissions.ts';
import type { AnalysisFilter } from '../../application/ports/analysis-read.ts';

import type { ReportsHttpDeps } from './composition.ts';
import {
  teamToDto,
  teamDemographicsToDto,
  suppliersWithoutContractToDto,
  paymentPositionToDto,
  analysisToReport,
  analysisToChart,
} from './dto.ts';
import {
  teamReportResponseSchema,
  teamDemographicsResponseSchema,
  suppliersWithoutContractResponseSchema,
  paymentPositionResponseSchema,
  analysisQuerySchema,
  analysisReportResponseSchema,
  analysisChartResponseSchema,
  type AnalysisQueryDto,
} from './schemas.ts';

const toAnalysisFilter = (q: AnalysisQueryDto): AnalysisFilter => ({
  dueStart: q.dueStart,
  dueEnd: q.dueEnd,
  ...(q.status !== undefined ? { status: q.status } : {}),
});

export type ReportsHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

const reportsRoutes =
  (deps: ReportsHttpDeps, hooks: ReportsHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // GET /reports/team — projeção Equipe ABC.
    scope.route({
      method: 'GET',
      url: '/reports/team',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
      schema: {
        response: { 200: teamReportResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listTeam();
        if (!result.ok) {
          return sendResult(reply, result, { errors: { 'team-report-read-unavailable': 503 } });
        }
        return sendResult(reply, ok(teamToDto(result.value)), { ok: 200 });
      },
    });

    // GET /reports/team/demographics — gênero × faixa etária × raça/cor, só CONTAGEM (CA1/CA2).
    // Gate dedicado: dado sensível LGPD (Art. 5º II) — `collaborator:read` sozinho não abre (CA7).
    scope.route({
      method: 'GET',
      url: '/reports/team/demographics',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.readSensitive)],
      schema: {
        response: { 200: teamDemographicsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listTeamDemographics();
        if (!result.ok) {
          return sendResult(reply, result, {
            errors: { 'team-demographics-read-unavailable': 503 },
          });
        }
        return sendResult(reply, ok(teamDemographicsToDto(result.value)), { ok: 200 });
      },
    });

    // GET /reports/suppliers-without-contract — agregação por fornecedor (payables sem contrato).
    scope.route({
      method: 'GET',
      url: '/reports/suppliers-without-contract',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        response: { 200: suppliersWithoutContractResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listSuppliersWithoutContract();
        if (!result.ok) {
          return sendResult(reply, result, {
            errors: {
              'suppliers-without-contract-read-unavailable': 503,
              // Fail-closed (#437): sem o conjunto de contratantes ativos não há como subtrair —
              // 503 em vez de 200 com a lista não-subtraída (que exporia quem tem contrato).
              'active-contractor-read-unavailable': 503,
            },
          });
        }
        return sendResult(reply, ok(suppliersWithoutContractToDto(result.value)), { ok: 200 });
      },
    });

    // GET /reports/payment-position — posição por fornecedor×CC×categoria (3 baldes).
    scope.route({
      method: 'GET',
      url: '/reports/payment-position',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        response: { 200: paymentPositionResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listPaymentPosition();
        if (!result.ok) {
          return sendResult(reply, result, {
            errors: { 'payment-position-read-unavailable': 503 },
          });
        }
        return sendResult(reply, ok(paymentPositionToDto(result.value)), { ok: 200 });
      },
    });

    // GET /reports/analysis/payables — AnalysisReport aninhado (categoria → mês + CC), filtro período.
    scope.route({
      method: 'GET',
      url: '/reports/analysis/payables',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        querystring: analysisQuerySchema,
        response: { 200: analysisReportResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listAnalysis(toAnalysisFilter(req.query));
        if (!result.ok) {
          return sendResult(reply, result, { errors: { 'analysis-read-unavailable': 503 } });
        }
        return sendResult(reply, ok(analysisToReport(result.value)), { ok: 200 });
      },
    });

    // GET /reports/analysis/chart — resumo por categoria (mesmo filtro de período).
    scope.route({
      method: 'GET',
      url: '/reports/analysis/chart',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIAL_PERMISSION.read)],
      schema: {
        querystring: analysisQuerySchema,
        response: { 200: analysisChartResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listAnalysis(toAnalysisFilter(req.query));
        if (!result.ok) {
          return sendResult(reply, result, { errors: { 'analysis-read-unavailable': 503 } });
        }
        return sendResult(reply, ok(analysisToChart(result.value)), { ok: 200 });
      },
    });
  };

export const reportsHttpPlugin =
  (deps: ReportsHttpDeps, hooks: ReportsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(reportsRoutes(deps, hooks));
  };
