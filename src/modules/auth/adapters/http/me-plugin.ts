/**
 * Plugin HTTP "Minha Conta" (spec 005 US7 — ADR-0006/0028/0033).
 *
 * Encapsula GET/PUT /me + POST /me/password-reset; o root registra sob /api/v1.
 * Autosserviço: TODAS as rotas operam em `req.userId` (do JWT) — sem parametro `:id`, logo é
 * impossivel agir sobre terceiros (self por construcao). Apenas `requireAuth` (sem authorize).
 * Sem use case novo: reusa getUser, updateUserProfile e requestPasswordReset. ASCII puro.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { getUser } from '../../application/use-cases/get-user.ts';
import type { updateUserProfile } from '../../application/use-cases/update-user-profile.ts';
import type { requestPasswordReset } from '../../application/use-cases/request-password-reset.ts';
import type {
  setProfilePhoto,
  removeProfilePhoto,
} from '../../application/use-cases/set-profile-photo.ts';
import {
  userDetailResponseSchema,
  meUpdateBodySchema,
  uploadPhotoQuerySchema,
} from './users-schemas.ts';
import {
  magicBytesMatch,
  PHOTO_BODY_LIMIT,
  PHOTO_SET_ERROR_STATUS,
  PHOTO_REMOVE_ERROR_STATUS,
} from './photo-upload.ts';

export type MeHttpDeps = Readonly<{
  getUser: ReturnType<typeof getUser>;
  updateUserProfile: ReturnType<typeof updateUserProfile>;
  requestPasswordReset: ReturnType<typeof requestPasswordReset>;
  setProfilePhoto: ReturnType<typeof setProfilePhoto>;
  removeProfilePhoto: ReturnType<typeof removeProfilePhoto>;
}>;

export type MeHttpHooks = Readonly<{ requireAuth: preHandlerAsyncHookHandler }>;

const PROFILE_VALIDATION_STATUS = {
  'name-required': 422,
  'email-empty': 422,
  'email-invalid-format': 422,
  'email-too-long': 422,
  'telephone-empty': 422,
  'telephone-invalid': 422,
} as const;

const meRoutes =
  (deps: MeHttpDeps, hooks: MeHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // USR-ME-PHOTO: parser binario p/ upload de foto (octet-stream -> Buffer). Escopo do plugin (não
    // afeta as rotas JSON). PHOTO_BODY_LIMIT compartilhado com o plugin admin via `photo-upload.ts`.
    scope.addContentTypeParser(
      'application/octet-stream',
      { parseAs: 'buffer', bodyLimit: PHOTO_BODY_LIMIT },
      (_req, body, done) => {
        done(null, body);
      },
    );

    // GET /me — o proprio perfil.
    scope.route({
      method: 'GET',
      url: '/me',
      preHandler: [hooks.requireAuth],
      schema: {
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getUser(req.userId);
        return sendResult(reply, result, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // PUT /me — edita o proprio perfil (name/telephone). Self por construcao (req.userId).
    scope.route({
      method: 'PUT',
      url: '/me',
      preHandler: [hooks.requireAuth],
      schema: {
        body: meUpdateBodySchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { name, email, telephone } = req.body;
        const updated = await deps.updateUserProfile({
          id: req.userId,
          ...(name !== undefined ? { name } : {}),
          ...(email !== undefined ? { email } : {}),
          ...(telephone !== undefined ? { telephone } : {}),
        });
        if (!updated.ok) {
          return sendResult(reply, updated, {
            errors: {
              ...PROFILE_VALIDATION_STATUS,
              'user-id-invalid': 400,
              'user-not-found': 404,
              'email-already-registered': 409,
              'user-repo-unavailable': 503,
            },
          });
        }
        const detail = await deps.getUser(req.userId);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // PUT /me/photo — troca a propria foto (octet-stream + ?mimeType=). Self por construcao (req.userId);
    // NAO exige `user:update` (so requireAuth), ao contrario do PUT /users/:id/photo (admin).
    scope.route({
      method: 'PUT',
      url: '/me/photo',
      preHandler: [hooks.requireAuth],
      schema: {
        querystring: uploadPhotoQuerySchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const bytes = req.body as Buffer;
        const { mimeType } = req.query;
        // Defesa em profundidade: a assinatura do arquivo deve casar com o mimeType declarado.
        if (bytes.length > 0 && !magicBytesMatch(mimeType, bytes)) {
          return sendResult(reply, err('photo-content-mismatch' as const), {
            errors: { 'photo-content-mismatch': 422 },
          });
        }
        const result = await deps.setProfilePhoto({
          targetId: req.userId,
          bytes: new Uint8Array(bytes),
          mimeType,
        });
        if (!result.ok) {
          return sendResult(reply, result, { errors: PHOTO_SET_ERROR_STATUS });
        }
        const detail = await deps.getUser(req.userId);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // DELETE /me/photo — remove a propria foto. Self por construcao (req.userId).
    scope.route({
      method: 'DELETE',
      url: '/me/photo',
      preHandler: [hooks.requireAuth],
      schema: {
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.removeProfilePhoto({ targetId: req.userId });
        if (!result.ok) {
          return sendResult(reply, result, { errors: PHOTO_REMOVE_ERROR_STATUS });
        }
        const detail = await deps.getUser(req.userId);
        return sendResult(reply, detail, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });

    // POST /me/password-reset — inicia o reset da propria senha (reusa o fluxo BE-REC-003).
    // Sempre 202 (assincrono); o email sai da identidade autenticada, nunca do body.
    scope.route({
      method: 'POST',
      url: '/me/password-reset',
      preHandler: [hooks.requireAuth],
      schema: {} satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const me = await deps.getUser(req.userId);
        if (me.ok) {
          // Erro de envio nao vaza ao cliente (consistencia anti-enumeracao): responde 202 sempre.
          await deps.requestPasswordReset({ email: me.value.email });
        }
        return sendResult(reply, ok({ accepted: true }), { ok: 202 });
      },
    });
  };

export const meHttpPlugin =
  (deps: MeHttpDeps, hooks: MeHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(meRoutes(deps, hooks));
  };
