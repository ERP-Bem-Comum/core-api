/**
 * Plugin HTTP do recurso Programas (ADR-0006/0025/0027/0033). Encapsula `/programs`; o root
 * registra sob `/api/v1` (espelho do legado). Espelha `partners/adapters/http/supplier-plugin.ts`.
 *
 * 7 rotas: lista paginada + criar + detalhe + editar (PUT, optimistic-lock) + desativar +
 * reativar + upload de logo. Escritas retornam o recurso no corpo (POST 201, demais 200).
 * Upload binário via content-type específico (image/png|jpeg|webp) com parser dedicado —
 * sem `@fastify/multipart`: tipo não suportado -> 415; payload > 5 MiB -> 413 (bodyLimit).
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

import type { ListProgramsQuery } from '../../domain/program/repository.ts';
import type { ProgramsHttpDeps } from './composition.ts';
import { programToItemDto, programToDetailDto } from './program-dto.ts';
import {
  programListQuerySchema,
  programIdParamSchema,
  programPaginatedSchema,
  programDetailSchema,
  createProgramBodySchema,
  updateProgramBodySchema,
  logoUploadedSchema,
} from './schemas.ts';
import { PROGRAM_PERMISSION } from '../../public-api/permissions.ts';

export type ProgramsHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// Parser dedicado do upload de logo: corpo opaco -> `Buffer`, teto 5 MiB (FR-021). `bodyLimit`
// por content-type preserva o global de 1 MiB nas demais rotas.
const LOGO_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;
const MAX_LOGO_BYTES = 5 * 1024 * 1024;

// Erro de escrita -> status. Default 422 (invariante de domínio: nome/sigla).
const WRITE_ERROR_STATUS: Readonly<Record<string, number>> = {
  'program-not-found': 404,
  'program-sigla-duplicated': 409,
  'program-not-active': 409,
  'program-not-inactive': 409,
  'program-version-conflict': 409,
  'program-repo-conflict': 409,
  'program-repo-unavailable': 503,
  'outbox-append-failed': 503,
  'logo-storage-unavailable': 503,
  'logo-too-large': 413,
  'logo-type-unsupported': 415,
  'logo-empty': 422,
  'program-name-required': 422,
  'program-sigla-invalid': 422,
};

const writeErrorStatus = (code: string): number => WRITE_ERROR_STATUS[code] ?? 422;

// PRG-LOGO-CONTENT: status dos erros de `getProgramLogo` (GET de bytes). `logo-object-missing`
// (logoKey aponta objeto que sumiu do storage) e 404 como "sem logo": o front cai no placeholder;
// 503 fica so para indisponibilidade real. Espelha PHOTO_GET_ERROR_STATUS.
const LOGO_GET_ERROR_STATUS = {
  'program-id-invalid': 400,
  'program-not-found': 404,
  'program-logo-not-found': 404,
  'logo-object-missing': 404,
  'logo-storage-unavailable': 503,
  'program-repo-unavailable': 503,
  'program-repo-conflict': 409,
  'outbox-append-failed': 503,
} as const;

const sendWriteError = (reply: FastifyReply, code: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

const programsRoutes =
  (deps: ProgramsHttpDeps, hooks: ProgramsHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    for (const mime of LOGO_MIME_TYPES) {
      scope.addContentTypeParser(
        mime,
        { parseAs: 'buffer', bodyLimit: MAX_LOGO_BYTES },
        (_req, body, done) => {
          done(null, body);
        },
      );
    }

    // GET /programs — lista paginada + busca (FR-011).
    scope.route({
      method: 'GET',
      url: '/programs',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.read)],
      schema: {
        querystring: programListQuerySchema,
        response: { 200: programPaginatedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const q = req.query;
        // exactOptionalPropertyTypes: só inclui search/status quando presentes.
        const query: ListProgramsQuery = {
          page: q.page,
          limit: q.limit,
          order: q.order,
          ...(q.search !== undefined ? { search: q.search } : {}),
          ...(q.status !== undefined ? { status: q.status } : {}),
        };
        const result = await deps.listPrograms(query);
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(
          reply,
          ok({ items: result.value.items.map(programToItemDto), meta: result.value.meta }),
          { ok: 200 },
        );
      },
    });

    // POST /programs — criar. 201 + Location + corpo (programa).
    scope.route({
      method: 'POST',
      url: '/programs',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.write)],
      schema: {
        body: createProgramBodySchema,
        response: { 201: programDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.createProgram(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        const dto = programToDetailDto(result.value.program);
        return reply
          .code(201)
          .header('location', `/api/v1/programs/${dto.id}`)
          .send(dto) as unknown as Promise<void>;
      },
    });

    // GET /programs/:id — detalhe.
    scope.route({
      method: 'GET',
      url: '/programs/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.read)],
      schema: {
        params: programIdParamSchema,
        response: { 200: programDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getProgram({ programId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(programToDetailDto(result.value.program)), { ok: 200 });
      },
    });

    // PUT /programs/:id — editar (optimistic-lock via `version`). 200 + corpo.
    scope.route({
      method: 'PUT',
      url: '/programs/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.write)],
      schema: {
        params: programIdParamSchema,
        body: updateProgramBodySchema,
        response: { 200: programDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.updateProgram({ programId: req.params.id, ...req.body });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(programToDetailDto(result.value.program)), { ok: 200 });
      },
    });

    // POST /programs/:id/deactivate — desativar (guarda de estado, sem version). 200 + corpo.
    scope.route({
      method: 'POST',
      url: '/programs/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.deactivate)],
      schema: {
        params: programIdParamSchema,
        response: { 200: programDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.deactivateProgram({ programId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(programToDetailDto(result.value.program)), { ok: 200 });
      },
    });

    // POST /programs/:id/reactivate — reativar (guarda de estado, sem version). 200 + corpo.
    scope.route({
      method: 'POST',
      url: '/programs/:id/reactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.deactivate)],
      schema: {
        params: programIdParamSchema,
        response: { 200: programDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.reactivateProgram({ programId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok(programToDetailDto(result.value.program)), { ok: 200 });
      },
    });

    // POST /programs/:id/logo — upload binário (image/png|jpeg|webp; ≤ 5 MiB). 200 + { logoKey }.
    scope.route({
      method: 'POST',
      url: '/programs/:id/logo',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.write)],
      schema: {
        params: programIdParamSchema,
        response: { 200: logoUploadedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // Corpo opaco entregue como `Buffer` pelo parser dedicado (ver topo).
        const bytes = req.body as unknown as Buffer;
        const mimeType = (req.headers['content-type'] ?? '').split(';')[0]?.trim() ?? '';
        const result = await deps.uploadProgramLogo({
          programId: req.params.id,
          bytes: new Uint8Array(bytes),
          mimeType,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return sendResult(reply, ok({ logoKey: result.value.program.logoKey ?? '' }), { ok: 200 });
      },
    });

    // GET /programs/:id/logo — bytes do logo (PRG-LOGO-CONTENT). Mesma `program:read` do detalhe.
    // Corpo binario (sem `response` schema — mesma convencao do GET /me/photo e documents/:id/content).
    // Cache: o hook onSend global do buildApp ja forca `no-store` em /api/* (nao redefinir aqui).
    scope.route({
      method: 'GET',
      url: '/programs/:id/logo',
      preHandler: [hooks.requireAuth, hooks.authorize(PROGRAM_PERMISSION.read)],
      schema: {
        params: programIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getProgramLogo({ targetId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, result, { errors: LOGO_GET_ERROR_STATUS });
        }
        return reply
          .header('content-type', result.value.contentType)
          .send(Buffer.from(result.value.bytes));
      },
    });
  };

export const programsHttpPlugin =
  (deps: ProgramsHttpDeps, hooks: ProgramsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(programsRoutes(deps, hooks));
  };
