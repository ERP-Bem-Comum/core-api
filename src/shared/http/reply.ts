/**
 * Helper Result → HTTP.
 *
 * sendResult(reply, ok(value), { ok: 200 }) → 200 com value serializado
 * sendResult(reply, err('x-not-found'), { errors: { 'x-not-found': 404 } })
 *   → 404 com envelope { error: { code, message, requestId } }
 */

import type { FastifyReply } from 'fastify';
import type { Result } from '#src/shared/primitives/result.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

export type SendResultOptions<E extends string> = Readonly<{
  /** Status HTTP para o caso ok. Default: 200. */
  ok?: number;
  /** Mapa de error-code → status HTTP para os casos err. */
  errors?: Readonly<Partial<Record<E, number>>>;
}>;

export const sendResult = <T, E extends string>(
  reply: FastifyReply,
  result: Result<T, E>,
  opts: SendResultOptions<E> = {},
): Promise<void> => {
  if (result.ok) {
    const status = opts.ok ?? 200;
    return reply.code(status).send(result.value) as unknown as Promise<void>;
  }

  const errorCode = result.error;
  const status = opts.errors?.[errorCode] ?? 500;
  const requestId = currentCorrelationId() ?? reply.request.id;

  return reply
    .code(status)
    .send(toErrorEnvelope(errorCode, errorCode, requestId)) as unknown as Promise<void>;
};
