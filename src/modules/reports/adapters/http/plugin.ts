/**
 * Plugin HTTP do módulo Reports (ADR-0006/0025/0027/0033). Encapsula `/reports`; registrado
 * DIRETO pelo root sob `/api/v2` (greenfield). Espelha `programs/adapters/http/plugin.ts`.
 *
 * Rotas:
 *  - GET /reports/team — projeção "Equipe ABC" (9 colunas LGPD-safe, REP-1 · #238).
 *  - GET /reports/suppliers-without-contract — agregação de payables sem contrato (REP-2 · #240).
 *  - GET /reports/payment-position — posição de pagamentos por fornecedor×CC×categoria (REP-4 · #243).
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

import type { ReportsHttpDeps } from './composition.ts';
import { teamToDto, suppliersWithoutContractToDto, paymentPositionToDto } from './dto.ts';
import {
  teamReportResponseSchema,
  suppliersWithoutContractResponseSchema,
  paymentPositionResponseSchema,
} from './schemas.ts';

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
            errors: { 'suppliers-without-contract-read-unavailable': 503 },
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
  };

export const reportsHttpPlugin =
  (deps: ReportsHttpDeps, hooks: ReportsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(reportsRoutes(deps, hooks));
  };
