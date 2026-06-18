/**
 * Plugin HTTP do recurso Users (spec 005 — ADR-0006/0025/0027/0028/0033/0037).
 *
 * Encapsula GET /users; o root registra sob /api/v1 -> GET /api/v1/users.
 * US1: listagem paginada administrativa (user:list, fail-closed).
 *
 * Padrao (fastify-server-expert; handbook/reference/fastify):
 *   - Encapsulation: plugin isolado por recurso; decorators/hooks no escopo do plugin.
 *   - preHandler [requireAuth, authorize('user:list')]: authn antes de authz.
 *   - Type Provider: wrapper externo withTypeProvider + register do plugin interno (zod-openapi).
 *   - Espelha src/modules/partners/adapters/http/supplier-plugin.ts.
 * ASCII puro.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import * as UserId from '../../domain/identity/user-id.ts';
import type { listUsers } from '../../application/use-cases/list-users.ts';
import type { getUser } from '../../application/use-cases/get-user.ts';
import type { createUserByAdmin } from '../../application/use-cases/create-user-by-admin.ts';
import type { updateUserProfile } from '../../application/use-cases/update-user-profile.ts';
import type {
  activateUser,
  deactivateUser,
} from '../../application/use-cases/activate-deactivate-user.ts';
import type {
  setProfilePhoto,
  removeProfilePhoto,
} from '../../application/use-cases/set-profile-photo.ts';
import type { getProfilePhoto } from '../../application/use-cases/get-profile-photo.ts';
import type { UserStatusFilter } from '../../application/ports/user-query.ts';
import {
  userListQuerySchema,
  userListResponseSchema,
  userIdParamSchema,
  userDetailResponseSchema,
  createUserBodySchema,
  createUserResponseSchema,
  updateUserBodySchema,
  uploadPhotoQuerySchema,
} from './users-schemas.ts';
import {
  magicBytesMatch,
  PHOTO_BODY_LIMIT,
  PHOTO_SET_ERROR_STATUS,
  PHOTO_REMOVE_ERROR_STATUS,
  PHOTO_GET_ERROR_STATUS,
} from './photo-upload.ts';

export type UsersHttpDeps = Readonly<{
  /** Use cases ja instanciados pela composition — nao re-instanciar aqui. */
  listUsers: ReturnType<typeof listUsers>;
  getUser: ReturnType<typeof getUser>;
  createUserByAdmin: ReturnType<typeof createUserByAdmin>;
  updateUserProfile: ReturnType<typeof updateUserProfile>;
  activateUser: ReturnType<typeof activateUser>;
  deactivateUser: ReturnType<typeof deactivateUser>;
  setProfilePhoto: ReturnType<typeof setProfilePhoto>;
  removeProfilePhoto: ReturnType<typeof removeProfilePhoto>;
  getProfilePhoto: ReturnType<typeof getProfilePhoto>;
}>;

export type UsersHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// Borda -> dominio: 'inactive' (spec HTTP) -> 'disabled' (UserStatusFilter).
const toStatusFilter = (httpStatus: 'active' | 'inactive' | 'all'): UserStatusFilter =>
  httpStatus === 'inactive' ? 'disabled' : httpStatus;

const USER_LIST_PERMISSION = 'user:list';
const USER_READ_PERMISSION = 'user:read';
const USER_CREATE_PERMISSION = 'user:create';
const USER_UPDATE_PERMISSION = 'user:update';
const USER_ACTIVATE_PERMISSION = 'user:activate';
const USER_DEACTIVATE_PERMISSION = 'user:deactivate';

// Limite dedicado das rotas de ESCRITA (POST/PUT/PATCH), separado do teto global (200/min). O token
// ja e exigido, mas evita abuso autenticado (ex.: convites em massa). Reads ficam no teto global.
const WRITE_RATE_LIMIT = { max: 30, timeWindow: '1 minute' } as const;

// Erros de validacao de campo (VOs) -> 422; compartilhado por POST e PUT.
const FIELD_VALIDATION_STATUS = {
  'name-required': 422,
  'email-empty': 422,
  'email-invalid-format': 422,
  'email-too-long': 422,
  'cpf-empty': 422,
  'cpf-invalid-length': 422,
  'cpf-invalid-checksum': 422,
  'telephone-empty': 422,
  'telephone-invalid': 422,
} as const;

const usersRoutes =
  (deps: UsersHttpDeps, hooks: UsersHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // US6: parser binario para upload de foto (octet-stream -> Buffer, ate 6 MiB). Escopo do plugin
    // (nao afeta as rotas JSON globais). bodyLimit aqui > limite do use case (5 MiB) para o excesso
    // virar 422 (regra) e nao 413; acima de 6 MiB o Fastify corta com 413 (protecao).
    scope.addContentTypeParser(
      'application/octet-stream',
      { parseAs: 'buffer', bodyLimit: PHOTO_BODY_LIMIT },
      (_req, body, done) => {
        done(null, body);
      },
    );

    // US1: GET /users — listagem paginada.
    scope.route({
      method: 'GET',
      url: '/users',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_LIST_PERMISSION)],
      schema: {
        querystring: userListQuerySchema,
        response: { 200: userListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { page, pageSize, search, status } = req.query;

        // exactOptionalPropertyTypes: omitir `search` quando ausente (nao passar undefined).
        const result = await deps.listUsers({
          page,
          pageSize,
          status: toStatusFilter(status),
          ...(search !== undefined ? { search } : {}),
        });

        if (!result.ok) {
          return sendResult(reply, result, {
            errors: {
              'invalid-page': 422,
              'invalid-page-size': 422,
              'user-query-unavailable': 503,
            },
          });
        }

        // HTTP-PAGINATION-HARMONIZE: mapeia o meta do read model (pageSize) para o
        // shape canonico da borda (itemsPerPage + itemCount), espelhando partners.
        const meta = result.value.meta;
        return sendResult(
          reply,
          ok({
            items: result.value.items,
            meta: {
              currentPage: meta.currentPage,
              itemsPerPage: meta.pageSize,
              itemCount: result.value.items.length,
              totalItems: meta.totalItems,
              totalPages: meta.totalPages,
            },
          }),
          { ok: 200 },
        );
      },
    });

    // US2: GET /users/:id — detalhe.
    scope.route({
      method: 'GET',
      url: '/users/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_READ_PERMISSION)],
      schema: {
        params: userIdParamSchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getUser(req.params.id);
        return sendResult(reply, result, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // US3: POST /users — criar (admin) + convite por email.
    scope.route({
      method: 'POST',
      url: '/users',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_CREATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        body: createUserBodySchema,
        response: { 201: createUserResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // adminId vem do JWT (requireAuth), NUNCA do body.
        const adminId = UserId.rehydrate(req.userId);
        if (!adminId.ok) {
          return sendResult(reply, err('user-id-invalid' as const), {
            errors: { 'user-id-invalid': 401 },
          });
        }
        const result = await deps.createUserByAdmin({
          adminId: adminId.value,
          name: req.body.name,
          cpf: req.body.cpf,
          email: req.body.email,
          telephone: req.body.telephone,
          // exactOptionalPropertyTypes: omitir a flag quando ausente (nao passar undefined).
          ...(req.body.massApprovalPermission !== undefined
            ? { massApprovalPermission: req.body.massApprovalPermission }
            : {}),
        });
        if (!result.ok) {
          return sendResult(reply, result, {
            errors: {
              ...FIELD_VALIDATION_STATUS,
              'email-already-registered': 409,
              // AUTH-MASS-APPROVE-SETTABLE: ator sem user:assign-role tentando setar a flag -> 403
              // (mesmo mapeamento de assign-role na borda).
              forbidden: 403,
              'mass-approver-role-invalid': 422,
              'role-repo-unavailable': 503,
              'user-repo-unavailable': 503,
              'password-reset-token-repo-unavailable': 503,
              // ADR-0047 (fatia 02): 'invite-mail-failed' removido — o envio do convite saiu do
              // use case (vai pro consumidor); o use case nao retorna mais esse erro.
            },
          });
        }
        // Location no 201 (RFC 7231 6.3.2): aponta para o recurso recem-criado. O body
        // { id } e preservado para compat com o front atual.
        const id = String(result.value.user.id);
        reply.header('location', `/api/v1/users/${id}`);
        return sendResult(reply, ok({ id }), { ok: 201 });
      },
    });

    // US4: PUT /users/:id — editar perfil (atomico). Resposta = detalhe atualizado (reusa getUser).
    scope.route({
      method: 'PUT',
      url: '/users/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_UPDATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userIdParamSchema,
        body: updateUserBodySchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { name, email, cpf, telephone, collaboratorId, massApprovalPermission } = req.body;
        // actorId vem do JWT (requireAuth), NUNCA do body — necessario p/ autorizar a flag (fail-closed).
        const actorId = UserId.rehydrate(req.userId);
        if (!actorId.ok) {
          return sendResult(reply, err('user-id-invalid' as const), {
            errors: { 'user-id-invalid': 401 },
          });
        }
        // exactOptionalPropertyTypes: omitir chaves ausentes (nao passar undefined).
        const updated = await deps.updateUserProfile({
          id: req.params.id,
          actorId: actorId.value,
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(cpf !== undefined ? { cpf } : {}),
          ...(telephone !== undefined ? { telephone } : {}),
          ...(collaboratorId !== undefined ? { collaboratorId } : {}),
          ...(massApprovalPermission !== undefined ? { massApprovalPermission } : {}),
        });
        if (!updated.ok) {
          return sendResult(reply, updated, {
            errors: {
              ...FIELD_VALIDATION_STATUS,
              'user-id-invalid': 400,
              'user-not-found': 404,
              'user-disabled': 422,
              'email-already-registered': 409,
              // AUTH-MASS-APPROVE-SETTABLE: ator sem user:assign-role tentando setar a flag -> 403.
              forbidden: 403,
              'mass-approver-role-invalid': 422,
              'role-repo-unavailable': 503,
              'user-repo-unavailable': 503,
            },
          });
        }
        // Detalhe atualizado com a mesma shape do GET /:id (massApprovalPermission etc.).
        const detail = await deps.getUser(req.params.id);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // US5: PATCH /users/:id/deactivate — desativar (idempotente; anti auto-lockout).
    scope.route({
      method: 'PATCH',
      url: '/users/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_DEACTIVATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userIdParamSchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // actorId do JWT (requireAuth), NUNCA do body — alimenta cannot-deactivate-self.
        const result = await deps.deactivateUser({ actorId: req.userId, targetId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, result, {
            errors: {
              'user-id-invalid': 400,
              'user-not-found': 404,
              'cannot-deactivate-self': 422,
              'user-repo-unavailable': 503,
            },
          });
        }
        const detail = await deps.getUser(req.params.id);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // US5: PATCH /users/:id/activate — reativar (idempotente).
    scope.route({
      method: 'PATCH',
      url: '/users/:id/activate',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_ACTIVATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userIdParamSchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.activateUser({ targetId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, result, {
            errors: {
              'user-id-invalid': 400,
              'user-not-found': 404,
              'user-repo-unavailable': 503,
            },
          });
        }
        const detail = await deps.getUser(req.params.id);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // USR-ME-PHOTO-DISPLAY: GET /users/:id/photo — bytes da foto do usuario (lado admin).
    // Read: mesma permissao do GET /users/:id (`user:read`). Corpo binario (sem `response` schema —
    // mesma convencao do documents/:id/content). Cache: hook onSend global ja forca `no-store`.
    scope.route({
      method: 'GET',
      url: '/users/:id/photo',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_READ_PERMISSION)],
      schema: {
        params: userIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getProfilePhoto({ targetId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, result, { errors: PHOTO_GET_ERROR_STATUS });
        }
        return reply
          .header('content-type', result.value.contentType)
          .send(Buffer.from(result.value.bytes));
      },
    });

    // US6: PUT /users/:id/photo — upload de foto (binario octet-stream + mimeType na query).
    scope.route({
      method: 'PUT',
      url: '/users/:id/photo',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_UPDATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userIdParamSchema,
        querystring: uploadPhotoQuerySchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const bytes = req.body as Buffer;
        const { mimeType } = req.query;
        // Defesa em profundidade: assinatura do arquivo deve casar com o mimeType declarado.
        if (bytes.length > 0 && !magicBytesMatch(mimeType, bytes)) {
          return sendResult(reply, err('photo-content-mismatch' as const), {
            errors: { 'photo-content-mismatch': 422 },
          });
        }
        const result = await deps.setProfilePhoto({
          targetId: req.params.id,
          bytes: new Uint8Array(bytes),
          mimeType,
        });
        if (!result.ok) {
          return sendResult(reply, result, { errors: PHOTO_SET_ERROR_STATUS });
        }
        const detail = await deps.getUser(req.params.id);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // US6: DELETE /users/:id/photo — remover foto.
    scope.route({
      method: 'DELETE',
      url: '/users/:id/photo',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_UPDATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userIdParamSchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.removeProfilePhoto({ targetId: req.params.id });
        if (!result.ok) {
          return sendResult(reply, result, { errors: PHOTO_REMOVE_ERROR_STATUS });
        }
        const detail = await deps.getUser(req.params.id);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });
  };

export const usersHttpPlugin =
  (deps: UsersHttpDeps, hooks: UsersHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(usersRoutes(deps, hooks));
  };
