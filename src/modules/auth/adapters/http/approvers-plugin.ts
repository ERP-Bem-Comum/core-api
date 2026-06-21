/**
 * Plugin HTTP de Aprovadores (#148 — ADR-0006/0028/0033).
 *
 * `GET /approvers` (root registra sob /api/v1 → `/api/v1/approvers`): lista os usuários ATIVOS com
 * a permissão `payable:approve`, para o front popular o dropdown "Aprovador" da inclusão do
 * documento financeiro. RBAC: `user:list` (é listagem de usuários). Read-only; projeção lean.
 *
 * Plugin SEPARADO do users-plugin de propósito: adicionar a rota lá exigiria mudar a assinatura de
 * `UsersHttpDeps` (10 callers) — aqui é puramente aditivo (server registra; testes próprios). ASCII puro.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { UserQuery } from '../../application/ports/user-query.ts';
import { approversResponseSchema } from './approvers-schemas.ts';

// Permissão que define um "aprovador" de título financeiro (espelha o gate de POST /documents/:id/approve).
const APPROVER_PERMISSION = 'payable:approve';
const LIST_PERMISSION = 'user:list';

export type ApproversHttpDeps = Readonly<{
  listUsersByPermission: UserQuery['listByPermission'];
}>;

export type ApproversHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

const approversRoutes =
  (deps: ApproversHttpDeps, hooks: ApproversHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.route({
      method: 'GET',
      url: '/approvers',
      preHandler: [hooks.requireAuth, hooks.authorize(LIST_PERMISSION)],
      schema: {
        response: { 200: approversResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listUsersByPermission(APPROVER_PERMISSION);
        if (!result.ok) {
          return sendResult(reply, result, { errors: { 'user-query-unavailable': 503 } });
        }
        const items = result.value.map((u) => ({ id: u.id, name: u.name, email: u.email }));
        return sendResult(reply, ok({ items }), { ok: 200 });
      },
    });
  };

export const approversHttpPlugin =
  (deps: ApproversHttpDeps, hooks: ApproversHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(approversRoutes(deps, hooks));
  };
