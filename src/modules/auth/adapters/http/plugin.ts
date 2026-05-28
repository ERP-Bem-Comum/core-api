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

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

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
          },
        });
      },
    });

    scope.route({
      method: 'POST',
      url: '/login',
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
  };

export const authHttpPlugin =
  (deps: AuthHttpDeps): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(authRoutes(deps), { prefix: '/auth' });
  };
