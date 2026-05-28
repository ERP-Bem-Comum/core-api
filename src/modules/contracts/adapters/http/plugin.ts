/**
 * Plugin HTTP do módulo contracts (ADR-0024/0025/0026/0028).
 *
 * Factory `(deps, { requireAuth }) => FastifyPluginAsync`: recebe os use cases já
 * instanciados (composition.ts) + o `requireAuth` do módulo auth, injetado pelo
 * composition root (`server.ts`). Cross-módulo via `auth/public-api/http.ts` (ADR-0006).
 * Encapsula `/contracts`; o root registra sob `/api/v2` → `/api/v2/contracts/*`.
 *
 * C0: toda rota exige autenticação (`requireAuth`, 401 sem token). RBAC fino por
 * permissão (`authorize`) entra com as mutações no C2. Zod contract-first (ADR-0027).
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { ContractRepositoryError } from '../../domain/contract/repository.ts';
import type { ContractsHttpDeps } from './composition.ts';
import { contractToListItem } from './contract-dto.ts';
import { contractListSchema } from './schemas.ts';

export type ContractsHttpHooks = Readonly<{ requireAuth: preHandlerAsyncHookHandler }>;

// `ContractRepositoryError` mistura string literals e tagged records `{tag,...}`
// (CTR-DOMAIN-TAGGED-ERRORS); a borda HTTP precisa de um code string para o envelope.
// Reads só produzem `contract-repo-*`; o `tag` cobre os demais (defensivo).
const repoErrorCode = (e: ContractRepositoryError): string => (typeof e === 'string' ? e : e.tag);

const contractsRoutes =
  (deps: ContractsHttpDeps, hooks: ContractsHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.route({
      method: 'GET',
      url: '/contracts',
      preHandler: hooks.requireAuth,
      schema: {
        response: { 200: contractListSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listContracts();
        if (!result.ok) {
          return sendResult(reply, err(repoErrorCode(result.error)), {
            errors: { 'contract-repo-unavailable': 503 },
          });
        }
        return sendResult(reply, ok(result.value.map(contractToListItem)), { ok: 200 });
      },
    });
  };

export const contractsHttpPlugin =
  (deps: ContractsHttpDeps, hooks: ContractsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    // Rotas com path completo `/contracts` (sem sub-prefixo): o root (`buildApp`) monta
    // sob `/api/v2` → `/api/v2/contracts` (path REST canônico, sem trailing slash, que é
    // o que o OpenAPI documenta). `register` ainda encapsula o escopo. Sub-recursos
    // (`/contracts/:id`, `/contracts/:id/history`) chegam no C1.
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(contractsRoutes(deps, hooks));
  };
