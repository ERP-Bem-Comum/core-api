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
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';
import type { AnalysisFilter, AnalysisRow } from '../../application/ports/analysis-read.ts';
import type { PaymentPositionFilter } from '../../application/ports/payment-position-read.ts';
import type { RealizedFilter } from '../../application/ports/realized-read.ts';

import type { ReportsHttpDeps } from './composition.ts';
import {
  teamToDto,
  teamDemographicsToDto,
  suppliersWithoutContractToDto,
  paymentPositionToDto,
  analysisToReport,
  analysisToChart,
  realizedToDto,
} from './dto.ts';
import {
  teamReportResponseSchema,
  teamDemographicsResponseSchema,
  suppliersWithoutContractResponseSchema,
  paymentPositionResponseSchema,
  paymentPositionQuerySchema,
  analysisQuerySchema,
  analysisReportResponseSchema,
  analysisChartResponseSchema,
  realizedQuerySchema,
  realizedReportResponseSchema,
  type AnalysisQueryDto,
  type PaymentPositionQueryDto,
  type RealizedQueryDto,
} from './schemas.ts';

const toAnalysisFilter = (q: AnalysisQueryDto): AnalysisFilter => ({
  dueStart: q.dueStart,
  dueEnd: q.dueEnd,
  ...(q.status !== undefined ? { status: q.status } : {}),
});

// #588: query (borda, validada) -> PaymentPositionFilter. Só inclui a chave quando presente
// (`exactOptionalPropertyTypes`: nunca gravar `undefined` explícito). Nomes 1:1 com a query.
const toPaymentPositionFilter = (q: PaymentPositionQueryDto): PaymentPositionFilter => ({
  ...(q.budgetPlanRef !== undefined ? { budgetPlanRef: q.budgetPlanRef } : {}),
  ...(q.dueFrom !== undefined ? { dueFrom: q.dueFrom } : {}),
  ...(q.dueTo !== undefined ? { dueTo: q.dueTo } : {}),
  ...(q.cedenteAccountRef !== undefined ? { cedenteAccountRef: q.cedenteAccountRef } : {}),
  ...(q.status !== undefined ? { status: q.status } : {}),
  ...(q.costCenterRef !== undefined ? { costCenterRef: q.costCenterRef } : {}),
  ...(q.categoryRef !== undefined ? { categoryRef: q.categoryRef } : {}),
  ...(q.subcategoryRef !== undefined ? { subcategoryRef: q.subcategoryRef } : {}),
  ...(q.supplierRef !== undefined ? { supplierRef: q.supplierRef } : {}),
});

// REP-3 (#446 Slice C): costura o RÓTULO do Plano Orçamentário. Colhe os `budgetPlanRef` DISTINTOS
// (não-nulos) das rows e delega ao `budget-plans/public-api` (`resolvePlanLabels`) — o rótulo é
// composto DENTRO do budget-plans (autonomia — ADR-0006/0051). Gracioso: se o read falhar, devolve
// um Map vazio (os nomes viram null) em vez de derrubar o relatório — os valores vêm do financial e
// o rótulo é decorativo. Nunca há JOIN cross-módulo (ADR-0014): o stitch é na aplicação.
const resolveLabels = async (
  deps: ReportsHttpDeps,
  rows: readonly AnalysisRow[],
): Promise<ReadonlyMap<string, string>> => {
  const ids = [
    ...new Set(rows.map((r) => r.budgetPlanRef).filter((ref): ref is string => ref !== null)),
  ];
  if (ids.length === 0) return new Map();
  const labelsR = await deps.resolvePlanLabels(ids);
  return labelsR.ok ? labelsR.value : new Map();
};

// Query (ids da borda) -> RealizedFilter (refs de árvore). `year` obrigatório já veio validado.
const toRealizedFilter = (q: RealizedQueryDto): RealizedFilter => ({
  year: q.year,
  ...(q.programId !== undefined ? { programRef: q.programId } : {}),
  ...(q.budgetPlanId !== undefined ? { budgetPlanId: q.budgetPlanId } : {}),
  ...(q.partnerStateId !== undefined ? { partnerStateRef: q.partnerStateId } : {}),
  ...(q.partnerMunicipalityId !== undefined
    ? { partnerMunicipalityRef: q.partnerMunicipalityId }
    : {}),
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
      // Mesmo gate da tabela (`collaborator:read`), NAO o `readSensitive`
      // (REPORTS-DEMOGRAPHICS-GATE-ALIGN, P.O. 2026-07-20): `GET /reports/team` expoe raca/genero
      // POR PESSOA, com nome, sob `read`. Trancar o agregado — que nao identifica ninguem — atras de
      // uma permissao MAIS restritiva nao protegia nada e deixava os 3 graficos vazios em todo
      // ambiente. O `readSensitive` segue no catalogo: a segregacao volta no redesenho do RBAC,
      // aplicada aos DOIS endpoints juntos (issue #497).
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
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
        querystring: paymentPositionQuerySchema,
        response: { 200: paymentPositionResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listPaymentPosition(toPaymentPositionFilter(req.query));
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
        const labels = await resolveLabels(deps, result.value);
        return sendResult(reply, ok(analysisToReport(result.value, labels)), { ok: 200 });
      },
    });

    // GET /reports/analysis/chart — resumo por Plano Orçamentário (mesmo filtro de período).
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
        const labels = await resolveLabels(deps, result.value);
        return sendResult(reply, ok(analysisToChart(result.value, labels)), { ok: 200 });
      },
    });

    // GET /reports/realized — Realizado × Planejado (S6 · #502). Árvore de 3 níveis, `year`
    // obrigatório (Zod strict). Gate CA11: DUAS permissões (AND) — o relatório expõe orçado E
    // realizado; ver só um lado não faz sentido. Dois `authorize` encadeados = conjunção.
    scope.route({
      method: 'GET',
      url: '/reports/realized',
      preHandler: [
        hooks.requireAuth,
        hooks.authorize(BUDGET_PLAN_PERMISSION.read),
        hooks.authorize(FINANCIAL_PERMISSION.read),
      ],
      schema: {
        querystring: realizedQuerySchema,
        response: { 200: realizedReportResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listRealized(toRealizedFilter(req.query));
        if (!result.ok) {
          return sendResult(reply, result, { errors: { 'realized-read-unavailable': 503 } });
        }
        return sendResult(reply, ok(realizedToDto(result.value)), { ok: 200 });
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
