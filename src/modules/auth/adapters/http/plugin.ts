/**
 * Plugin HTTP do módulo auth (ADR-0024/0025/0028).
 *
 * Factory `(deps) => FastifyPluginAsync`: recebe os use cases já instanciados (composition.ts)
 * por injeção — o plugin só os invoca, sem conhecer adapter algum (ADR-0006). Encapsula `/auth`;
 * o root registra sob `/api/v2` → `/api/v2/auth/*`. Zod contract-first (ADR-0027).
 *
 * H1a: register + login. refresh + logout chegam no H1b (mesmas deps).
 */

import type { FastifyPluginAsync } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import * as UserId from '../../domain/identity/user-id.ts';
import type { AuthHttpDeps } from './composition.ts';
import { makeRequireAuth } from './auth-hook.ts';
import {
  registerBodySchema,
  registerResponseSchema,
  loginBodySchema,
  loginResponseSchema,
  refreshBodySchema,
  refreshResponseSchema,
  logoutBodySchema,
  meResponseSchema,
  changePasswordBodySchema,
  forgotPasswordBodySchema,
  resetPasswordBodySchema,
} from './schemas.ts';

const authRoutes =
  (deps: AuthHttpDeps): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.decorateRequest('userId', '');
    const requireAuth = makeRequireAuth(deps.verifyAccessToken);

    scope.route({
      method: 'POST',
      url: '/register',
      schema: {
        body: registerBodySchema,
        response: { 201: registerResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.registerUser({
          email: req.body.email,
          password: req.body.password,
        });
        const mapped = result.ok
          ? ok({ userId: result.value.user.id, email: result.value.user.email })
          : result;
        return sendResult(reply, mapped, {
          ok: 201,
          errors: {
            'email-already-registered': 409,
            'email-empty': 422,
            'email-invalid-format': 422,
            'email-too-long': 422,
            'password-too-short': 422,
            'password-too-long': 422,
            'password-too-common': 422,
          },
        });
      },
    });

    scope.route({
      method: 'POST',
      url: '/login',
      // BE-REC-001: limite dedicado e restritivo (separado do teto global) contra brute force.
      config: { rateLimit: deps.sensitiveRateLimit },
      schema: {
        body: loginBodySchema,
        response: { 200: loginResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.authenticateUser({
          email: req.body.email,
          password: req.body.password,
        });
        return sendResult(reply, result, {
          ok: 200,
          errors: { 'invalid-credentials': 401, 'user-disabled': 403 },
        });
      },
    });

    scope.route({
      method: 'POST',
      url: '/refresh',
      // BE-REC-001: limite dedicado (brute force / replay de refresh).
      config: { rateLimit: deps.sensitiveRateLimit },
      schema: {
        body: refreshBodySchema,
        response: { 200: refreshResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.refreshAccessToken({ refreshToken: req.body.refreshToken });
        return sendResult(reply, result, {
          ok: 200,
          errors: {
            'refresh-token-not-found': 401,
            'refresh-token-revoked': 401,
            'refresh-token-rotated': 401,
            'refresh-token-expired': 401,
            'user-disabled': 403,
          },
        });
      },
    });

    scope.route({
      method: 'POST',
      url: '/logout',
      schema: { body: logoutBodySchema } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.revokeSession({ refreshToken: req.body.refreshToken });
        return sendResult(reply, result, { ok: 204 });
      },
    });

    scope.route({
      method: 'GET',
      url: '/me',
      preHandler: requireAuth,
      schema: { response: { 200: meResponseSchema } } satisfies FastifyZodOpenApiSchema,
      handler: (req) => ({ userId: req.userId }),
    });

    // BE-REC-004: troca de senha autenticada. userId vem do JWT (requireAuth), nunca do body.
    // changePassword revoga TODAS as sessoes do usuario apos a troca (DD-USER-06).
    scope.route({
      method: 'POST',
      url: '/change-password',
      preHandler: requireAuth,
      schema: { body: changePasswordBodySchema } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const id = UserId.rehydrate(req.userId);
        if (!id.ok) {
          return sendResult(reply, err('invalid-credentials'), {
            ok: 204,
            errors: { 'invalid-credentials': 401 },
          });
        }
        const result = await deps.changePassword({
          userId: id.value,
          currentPassword: req.body.currentPassword,
          newPassword: req.body.newPassword,
        });
        const mapped = result.ok ? ok(undefined) : result;
        return sendResult(reply, mapped, {
          ok: 204,
          errors: {
            'invalid-credentials': 401,
            'user-disabled': 403,
            'password-too-short': 422,
            'password-too-long': 422,
            'password-too-common': 422,
          },
        });
      },
    });

    // BE-REC-003: solicitação de reset de senha. Resposta SEMPRE 202 (anti-enumeração) —
    // o use case faz best-effort (não revela existência); erro real é só logado.
    scope.route({
      method: 'POST',
      url: '/forgot-password',
      // Rate-limit dedicado: endpoint de e-mail é abusável (spam/enumeração por volume).
      config: { rateLimit: deps.sensitiveRateLimit },
      schema: { body: forgotPasswordBodySchema } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.requestPasswordReset({ email: req.body.email });
        if (!result.ok) req.log.error({ err: result.error }, 'forgot-password falhou');
        return reply.code(202).send();
      },
    });

    // BE-REC-003: confirma o reset com o token (one-time) + nova senha. Troca a senha e revoga
    // todas as sessoes. Erros de token/senha mapeados; sucesso 204.
    scope.route({
      method: 'POST',
      url: '/reset-password',
      config: { rateLimit: deps.sensitiveRateLimit },
      schema: { body: resetPasswordBodySchema } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.confirmPasswordReset({
          token: req.body.token,
          newPassword: req.body.newPassword,
        });
        const mapped = result.ok ? ok(undefined) : result;
        return sendResult(reply, mapped, {
          ok: 204,
          errors: {
            'reset-token-invalid': 400,
            'reset-token-expired': 400,
            'reset-token-used': 400,
            'password-too-short': 422,
            'password-too-long': 422,
            'password-too-common': 422,
            'user-disabled': 403,
          },
        });
      },
    });

    // BE-REC-004: encerra todas as sessoes do usuario autenticado (logout de todos os dispositivos).
    scope.route({
      method: 'POST',
      url: '/sessions/revoke-all',
      preHandler: requireAuth,
      handler: async (req, reply) => {
        const id = UserId.rehydrate(req.userId);
        if (!id.ok) {
          return sendResult(reply, err('invalid-credentials'), {
            ok: 204,
            errors: { 'invalid-credentials': 401 },
          });
        }
        const result = await deps.revokeAllSessionsForUser({ userId: id.value });
        return sendResult(reply, result, { ok: 204 });
      },
    });
  };

export const authHttpPlugin =
  (deps: AuthHttpDeps): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(authRoutes(deps), { prefix: '/auth' });
  };
