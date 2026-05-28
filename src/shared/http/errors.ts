/**
 * Error handler central do servidor HTTP.
 *
 * Envelope de erro (contrato publico):
 *   { error: { code: string; message: string; requestId: string } }
 *
 * Regras:
 * - ZodError (validacao de shape) → 400, code 'validation'
 * - 404 (rota inexistente) → 404, code 'not-found'
 * - default → 500, code 'internal'; stack e mensagem interna NUNCA vazam no body
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod/v4';
import { RequestValidationError } from 'fastify-zod-openapi';

import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

export type ErrorEnvelope = Readonly<{
  error: Readonly<{
    code: string;
    message: string;
    requestId: string;
  }>;
}>;

const resolveRequestId = (req: FastifyRequest): string => currentCorrelationId() ?? req.id;

export const toErrorEnvelope = (
  code: string,
  message: string,
  requestId: string,
): ErrorEnvelope => ({
  error: { code, message, requestId },
});

export const installErrorHandlers = (
  app: Readonly<{
    setErrorHandler: (
      handler: (error: FastifyError, req: FastifyRequest, reply: FastifyReply) => Promise<void>,
    ) => void;
    setNotFoundHandler: (
      handler: (req: FastifyRequest, reply: FastifyReply) => Promise<void>,
    ) => void;
    log: Readonly<{ error: (obj: unknown, msg: string) => void }>;
  }>,
): void => {
  app.setErrorHandler(async (error, req, reply) => {
    const requestId = resolveRequestId(req);

    // FST_ERR_VALIDATION: Fastify empacota erros de validacao Zod neste codigo.
    // FastifyError.code e FastifyError.validation sao propriedades tipadas (fastify.d.ts).
    // Tambem cobre ZodError direto e RequestValidationError.
    const isFastifyValidation =
      error.code === 'FST_ERR_VALIDATION' || error.validation !== undefined;
    const isZodDirect = error instanceof ZodError;
    const isRequestValidation = error instanceof RequestValidationError;

    if (isFastifyValidation || isZodDirect || isRequestValidation) {
      await reply
        .code(400)
        .send(toErrorEnvelope('validation', 'Request validation failed', requestId));
      return;
    }

    // Outros erros Fastify com statusCode < 500 (rate-limit, cors, etc.)
    // FastifyError.statusCode e propriedade tipada opcional.
    const fastifyStatusCode = error.statusCode;
    if (fastifyStatusCode !== undefined && fastifyStatusCode < 500) {
      await reply
        .code(fastifyStatusCode)
        .send(toErrorEnvelope('request-error', 'Request could not be processed', requestId));
      return;
    }

    // Erro interno — loga completo no servidor, nunca vaza no body
    app.log.error({ err: error }, 'unhandled-error');
    await reply
      .code(500)
      .send(toErrorEnvelope('internal', 'An internal error occurred', requestId));
  });

  app.setNotFoundHandler(async (req, reply) => {
    const requestId = resolveRequestId(req);
    await reply.code(404).send(toErrorEnvelope('not-found', 'Route not found', requestId));
  });
};
