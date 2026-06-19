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
  collaboratorHistoryToCsv,
  type CollaboratorHistoryGroup,
} from '../export/collaborator-history-csv.ts';
import type { Collaborator } from '../../domain/collaborator/types.ts';
import type { CollaboratorHistoryEntry } from '../../application/ports/collaborator-history.ts';
import {
  collaboratorListQuerySchema,
  collaboratorExportQuerySchema,
  collaboratorPaginatedSchema,
  collaboratorDetailSchema,
  collaboratorIdParamSchema,
  collaboratorHistoryExportQuerySchema,
  createCollaboratorBodySchema,
  completeRegistrationBodySchema,
  deactivateCollaboratorBodySchema,
  updateCollaboratorBodySchema,
  autocadastroQuerySchema,
  autocadastroBodySchema,
  autocadastroPreviewSchema,
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

// #126: monta um grupo (identidade + entradas) para o CSV de histórico de 9 colunas.
// `programa` = área de atuação. Usado pelo export da lista e do detalhe.
const toHistoryGroup = (
  c: Collaborator,
  entries: readonly CollaboratorHistoryEntry[],
): CollaboratorHistoryGroup => ({
  identity: {
    name: c.name,
    email: c.email,
    cpf: String(c.cpf),
    programa: c.occupationArea,
    startOfContract: c.startOfContract,
  },
  entries,
});

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
  // Autocadastro (US5): 404 uniforme anti-enumeração (desconhecido == expirado).
  'collaborator-autocadastro-token-expired',
  'collaborator-autocadastro-token-used',
]);
const BAD_REQUEST_CODES: ReadonlySet<string> = new Set([
  'complete-collaborator-registration-invalid-id',
  'deactivate-collaborator-invalid-id',
  'reactivate-collaborator-invalid-id',
  'edit-collaborator-invalid-id',
  'collaborator-autocadastro-cpf-mismatch',
]);
const FORBIDDEN_CODES: ReadonlySet<string> = new Set(['edit-collaborator-sensitive-forbidden']);
const REPO_UNAVAILABLE_CODES: ReadonlySet<string> = new Set([
  'collaborator-repo-unavailable',
  'invite-token-repo-unavailable',
]);

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

// Rate-limit dedicado das rotas PÚBLICAS de autocadastro (W2/M2): são as únicas sem requireAuth,
// alvo de brute-force de token/cpfPrefix. Espelha o sensitiveRateLimit do auth (por-rota, sobre o
// rate-limit global). O fluxo legítimo é pontual (1 view + 1 submit por convite).
const AUTOCADASTRO_RATE_LIMIT = { max: 10, timeWindow: '1 minute' } as const;

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
        const counts = await deps.getContractCounts(
          page.items.map((rec) => String(rec.collaborator.id)),
        );
        if (!counts.ok) {
          return sendResult(reply, err(counts.error), {
            errors: { 'contract-count-store-unavailable': 503 },
          });
        }
        return sendResult(
          reply,
          ok({
            items: page.items.map((rec) =>
              collaboratorToDetailDto(rec, counts.value.get(String(rec.collaborator.id)) ?? 0),
            ),
            meta: page.meta,
          }),
          { ok: 200 },
        );
      },
    });

    // Export CSV (US-002 / spec 003 + #126): `?type=history` → CSV combinado do histórico de TODOS
    // os colaboradores do filtro (formato legado de 9 colunas); sem `type` → CSV da lista. Rota
    // estática tem precedência sobre `/:id`. `collaborator:read`.
    scope.route({
      method: 'GET',
      url: '/collaborators/export',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
      schema: {
        querystring: collaboratorExportQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listCollaboratorRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'collaborator-read-unavailable': 503 },
          });
        }
        const collaborators = collaboratorsForExport(result.value, queryToFilter(req.query));

        if (req.query.type === 'history') {
          const groups: CollaboratorHistoryGroup[] = [];
          for (const c of collaborators) {
            const hist = await deps.listCollaboratorHistory(String(c.id));
            if (!hist.ok) {
              return sendResult(reply, err(hist.error), {
                errors: { 'collaborator-repo-unavailable': 503 },
              });
            }
            groups.push(toHistoryGroup(c, hist.value));
          }
          return reply
            .code(200)
            .header('content-type', 'text/csv; charset=utf-8')
            .header('content-disposition', 'attachment; filename="collaborators-history.csv"')
            .header('x-content-type-options', 'nosniff')
            .send(collaboratorHistoryToCsv(groups)) as unknown as Promise<void>;
        }

        const csv = collaboratorsToCsv(collaborators);
        return reply
          .code(200)
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', 'attachment; filename="collaborators.csv"')
          .header('x-content-type-options', 'nosniff')
          .send(csv) as unknown as Promise<void>;
      },
    });

    // Export do histórico de alterações de um colaborador (US4). `?type=history`. CSV legado
    // (separador `;`, datas dd/MM/aaaa). Reader indisponível → 503. `collaborator:read`.
    scope.route({
      method: 'GET',
      url: '/collaborators/:id/export',
      preHandler: [hooks.requireAuth, hooks.authorize(COLLABORATOR_PERMISSION.read)],
      schema: {
        params: collaboratorIdParamSchema,
        querystring: collaboratorHistoryExportQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listCollaboratorHistory(req.params.id);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'collaborator-repo-unavailable': 503 },
          });
        }
        // #126: 9 colunas → precisa da identidade. Reader indisponível → 503; inexistente → 404.
        const rec = await deps.getCollaboratorById(req.params.id);
        if (!rec.ok) {
          return sendResult(reply, err(rec.error), {
            errors: { 'collaborator-read-unavailable': 503 },
          });
        }
        if (rec.value === null) {
          return sendResult(reply, err('collaborator-not-found' as const), {
            errors: { 'collaborator-not-found': 404 },
          });
        }
        const csv = collaboratorHistoryToCsv([
          toHistoryGroup(rec.value.collaborator, result.value),
        ]);
        return reply
          .code(200)
          .header('content-type', 'text/csv; charset=utf-8')
          .header(
            'content-disposition',
            `attachment; filename="collaborator-${req.params.id}-history.csv"`,
          )
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
        const contractorRef = String(result.value.collaborator.id);
        const counts = await deps.getContractCounts([contractorRef]);
        if (!counts.ok) {
          return sendResult(reply, err(counts.error), {
            errors: { 'contract-count-store-unavailable': 503 },
          });
        }
        return sendResult(
          reply,
          ok(collaboratorToDetailDto(result.value, counts.value.get(contractorRef) ?? 0)),
          { ok: 200 },
        );
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
        const collaborator = result.value.collaborator;
        // US5: o pré-cadastro dispara o convite de autocadastro (mint + e-mail) — composto na
        // ROTA (não no use case registerCollaborator, p/ não disparar convite no import em lote).
        const invited = await deps.issueCollaboratorInvite({
          collaboratorId: collaborator.id,
          email: collaborator.email,
          recipientName: collaborator.name,
        });
        if (!invited.ok) return sendWriteError(reply, invited.error);
        return reply
          .code(201)
          .header('location', `/api/v1/collaborators/${String(collaborator.id)}`)
          .send() as unknown as Promise<void>;
      },
    });

    // Autocadastro público (US5) — SEM requireAuth. Rotas ESTÁTICAS: têm precedência sobre /:id
    // no radix tree do Fastify. GET: token válido → 200 (CPF mascarado); desconhecido/expirado/
    // usado → 404 UNIFORME (anti-enumeração OWASP).
    scope.route({
      method: 'GET',
      url: '/collaborators/autocadastro',
      config: { rateLimit: AUTOCADASTRO_RATE_LIMIT },
      schema: {
        querystring: autocadastroQuerySchema,
        response: { 200: autocadastroPreviewSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.viewCollaboratorInvite({ token: req.query.token });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send(result.value) as unknown as Promise<void>;
      },
    });

    // POST: completa via token (uso-único). CPF não confere → 400 (token preservado);
    // expirado/usado → 404; sucesso → 200 + token invalidado (markUsed atômico).
    scope.route({
      method: 'POST',
      url: '/collaborators/autocadastro',
      config: { rateLimit: AUTOCADASTRO_RATE_LIMIT },
      schema: {
        body: autocadastroBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.completeCollaboratorRegistrationViaInvite(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
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
