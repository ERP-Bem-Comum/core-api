/**
 * Plugin HTTP do recurso Colaboradores (ADR-0024/0025/0026/0028/0033).
 *
 * Factory `(deps, { requireAuth, authorize }) => FastifyPluginAsync`: recebe os use cases
 * já instanciados (composition.ts) + os hooks do módulo auth, injetados pelo composition
 * root (`server.ts`). Cross-módulo via `auth/public-api/http.ts` (ADR-0006). Encapsula
 * `/collaborators`; o root registra sob `/api/v1` (espelho do legado, ADR-0033) →
 * `/api/v1/collaborators*`.
 *
 * P0: `GET /collaborators` (lista), `authorize('collaborator:read')`. Zod contract-first
 * (ADR-0027). Mapeamento erro→HTTP: 503 repo indisponível (demais não ocorrem na leitura).
 */

import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

import type { PartnersHttpDeps } from './composition.ts';
import { collaboratorToDetailDto } from './collaborator-dto.ts';
import { parseCollaboratorImportCsv } from './collaborator-import-dto.ts';
import {
  queryToFilter,
  paginateRecords,
  collaboratorsForExport,
} from './collaborator-list-query.ts';
import { collaboratorsToCsv } from '../export/collaborator-csv.ts';
import {
  collaboratorListQuerySchema,
  collaboratorPaginatedSchema,
  collaboratorDetailSchema,
  collaboratorIdParamSchema,
  createCollaboratorBodySchema,
  completeRegistrationBodySchema,
  deactivateCollaboratorBodySchema,
  updateCollaboratorBodySchema,
} from './schemas.ts';
import { COLLABORATOR_PERMISSION } from '../../public-api/permissions.ts';

export type CollaboratorsHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  /** Fábrica de preHandler RBAC por nome de permissão (auth/public-api). */
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
  /** Checagem consultável de permissão (RBAC condicional do campo vital — edição). */
  hasPermission: (req: FastifyRequest, permissionName: string) => Promise<boolean>;
}>;

const SENSITIVE_PERMISSION = 'collaborator:edit-sensitive';

// Conflito de estado/unicidade → 409.
const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'register-collaborator-cpf-duplicate',
  'register-collaborator-email-duplicate',
  'collaborator-cpf-duplicate',
  'collaborator-email-duplicate',
  'edit-collaborator-cpf-duplicate',
  'edit-collaborator-email-duplicate',
  'collaborator-already-complete',
  'collaborator-already-inactive',
  'collaborator-already-active',
]);
const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'complete-collaborator-registration-not-found',
  'deactivate-collaborator-not-found',
  'reactivate-collaborator-not-found',
  'edit-collaborator-not-found',
]);
const BAD_REQUEST_CODES: ReadonlySet<string> = new Set([
  'complete-collaborator-registration-invalid-id',
  'deactivate-collaborator-invalid-id',
  'reactivate-collaborator-invalid-id',
  'edit-collaborator-invalid-id',
]);
const FORBIDDEN_CODES: ReadonlySet<string> = new Set(['edit-collaborator-sensitive-forbidden']);
const REPO_UNAVAILABLE_CODES: ReadonlySet<string> = new Set(['collaborator-repo-unavailable']);

// Erro de escrita → status. Default 422 (invariante de domínio: nome/email/cpf/enum inválidos).
const writeErrorStatus = (code: string): number => {
  if (FORBIDDEN_CODES.has(code)) return 403;
  if (CONFLICT_CODES.has(code)) return 409;
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (BAD_REQUEST_CODES.has(code)) return 400;
  if (REPO_UNAVAILABLE_CODES.has(code)) return 503;
  return 422;
};

const sendWriteError = (reply: FastifyReply, code: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

// Teto do corpo do import CSV (US-001): controla DoS por conteúdo grande (resource exhaustion —
// o use-case importa linha a linha, sequencial). `bodyLimit` por parser preserva o global nas
// demais rotas. ~2 MiB cobre o volume real (≤ alguns milhares de linhas).
const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

const collaboratorsRoutes =
  (deps: PartnersHttpDeps, hooks: CollaboratorsHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // Import de colaboradores (US-001): corpo `text/csv` cru → string (sem @fastify/multipart;
    // o BFF traduz multipart→raw — ADR-0002 / dependências mínimas). `bodyLimit` por parser.
    scope.addContentTypeParser(
      'text/csv',
      { parseAs: 'string', bodyLimit: MAX_IMPORT_BYTES },
      (_req, body, done) => {
        done(null, body);
      },
    );

    // Lista paginada + multifiltro (P1b): item = detalhe completo (schema legado). Filtro e
    // paginação compostos na borda (ADR-0032) sobre os read-records do reader.
    scope.route({
      method: 'GET',
      url: '/collaborators',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
      schema: {
        querystring: collaboratorListQuerySchema,
        response: { 200: collaboratorPaginatedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listCollaboratorRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'collaborator-read-unavailable': 503 },
          });
        }
        const page = paginateRecords(result.value, queryToFilter(req.query), req.query);
        return sendResult(
          reply,
          ok({ items: page.items.map(collaboratorToDetailDto), meta: page.meta }),
          { ok: 200 },
        );
      },
    });

    // Export CSV (US-002 / spec 003): filtra (search/active/…) e serializa via util compartilhado
    // (escape anti-fórmula). Rota estática tem precedência sobre `/:id`. `collaborator:read`.
    scope.route({
      method: 'GET',
      url: '/collaborators/export',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
      schema: {
        querystring: collaboratorListQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listCollaboratorRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'collaborator-read-unavailable': 503 },
          });
        }
        const csv = collaboratorsToCsv(
          collaboratorsForExport(result.value, queryToFilter(req.query)),
        );
        return reply
          .code(200)
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', 'attachment; filename="collaborators.csv"')
          .header('x-content-type-options', 'nosniff')
          .send(csv) as unknown as Promise<void>;
      },
    });

    // Detalhe (P1a): espelha o schema legado `Collaborator`. :id é UUID (Zod → 400);
    // inexistente → 404; reader indisponível → 503.
    scope.route({
      method: 'GET',
      url: '/collaborators/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
      schema: {
        params: collaboratorIdParamSchema,
        response: { 200: collaboratorDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getCollaboratorById(req.params.id);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'collaborator-read-unavailable': 503 },
          });
        }
        if (result.value === null) {
          return sendResult(reply, err('collaborator-not-found'), {
            errors: { 'collaborator-not-found': 404 },
          });
        }
        return sendResult(reply, ok(collaboratorToDetailDto(result.value)), { ok: 200 });
      },
    });

    // Cadastro (P2): cria pré-cadastro. 201 + Location (sem corpo; cliente segue a URL p/ detalhe).
    scope.route({
      method: 'POST',
      url: '/collaborators',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.write)],
      schema: {
        body: createCollaboratorBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.registerCollaborator(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        const id = String(result.value.collaborator.id);
        return reply
          .code(201)
          .header('location', `/api/v1/collaborators/${id}`)
          .send() as unknown as Promise<void>;
      },
    });

    // Completar cadastro (P2): PreRegistration → Complete. Autenticado (decisão do dono).
    scope.route({
      method: 'PATCH',
      url: '/collaborators/:id/complete-registration',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.write)],
      schema: {
        params: collaboratorIdParamSchema,
        body: completeRegistrationBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.completeCollaboratorRegistration({
          collaboratorId: req.params.id,
          ...req.body,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Desativar (P3): Active → Inactive (soft-delete). Body { disableBy }.
    scope.route({
      method: 'POST',
      url: '/collaborators/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.write)],
      schema: {
        params: collaboratorIdParamSchema,
        body: deactivateCollaboratorBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.deactivateCollaborator({
          collaboratorId: req.params.id,
          disableBy: req.body.disableBy,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Reativar (P3): Inactive → Active.
    scope.route({
      method: 'POST',
      url: '/collaborators/:id/reactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.write)],
      schema: {
        params: collaboratorIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.reactivateCollaborator({ collaboratorId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Edição cadastral (PUT total dos 7 campos; pessoais/estado preservados). `collaborator:write`
    // edita não-vitais; mudar o CPF (vital) exige `collaborator:edit-sensitive` (regra no use case).
    scope.route({
      method: 'PUT',
      url: '/collaborators/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.write)],
      schema: {
        params: collaboratorIdParamSchema,
        body: updateCollaboratorBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const canEditSensitive = await hooks.hasPermission(req, SENSITIVE_PERMISSION);
        const result = await deps.editCollaborator({
          collaboratorId: req.params.id,
          canEditSensitive,
          ...req.body,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Import em lote (US-001): corpo `text/csv`. Sempre 200 com relatório `{ created, failed }`
    // (import parcial: válidas entram, inválidas viram `failed`). Exceções: corpo vazio → 200
    // created:0; CSV malformado → 400.
    scope.route({
      method: 'POST',
      url: '/collaborators/import',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.write)],
      handler: async (req, reply) => {
        const content = req.body as unknown as string;
        const parsed = parseCollaboratorImportCsv(content);
        if (!parsed.ok) {
          if (parsed.error === 'csv-empty') {
            return reply.code(200).send({ created: 0, failed: [] }) as unknown as Promise<void>;
          }
          const requestId = currentCorrelationId() ?? reply.request.id;
          return reply
            .code(400)
            .send(
              toErrorEnvelope(
                'collaborator-import-malformed',
                'collaborator-import-malformed',
                requestId,
              ),
            ) as unknown as Promise<void>;
        }

        const { commands, lineOf, mappingFailures } = parsed.value;
        const result = await deps.importCollaborators({ rows: commands });
        // `importCollaborators` é `Result<_, never>` (nunca falha global); narrowing explícito
        // para o type-checker liberar `result.value`.
        if (!result.ok) return sendWriteError(reply, 'collaborator-import-failed');
        const out = result.value;
        const domainFailures = out.failed.map((f) => ({
          line: lineOf[f.index] ?? -1,
          error: typeof f.error === 'string' ? f.error : 'register-collaborator-failed',
        }));
        const failed = [...mappingFailures, ...domainFailures].sort((a, b) => a.line - b.line);
        return reply
          .code(200)
          .send({ created: out.importedCount, failed }) as unknown as Promise<void>;
      },
    });
  };

export const collaboratorsHttpPlugin =
  (deps: PartnersHttpDeps, hooks: CollaboratorsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    // Path completo `/collaborators` (sem sub-prefixo): o root (`buildApp`) monta sob
    // `/api/v1` → `/api/v1/collaborators*`. `register` encapsula o escopo.
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(collaboratorsRoutes(deps, hooks));
  };
