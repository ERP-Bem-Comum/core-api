import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import Fastify from 'fastify';

import { err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

const appSending = async (
  code: 'x-not-found' | 'x-unavailable',
  publicMessage?: (code: string, status: number) => string,
) => {
  const app = Fastify({ logger: false });
  app.get('/', (_req, reply) =>
    sendResult(reply, err(code), {
      errors: { 'x-not-found': 404, 'x-unavailable': 503 },
      ...(publicMessage !== undefined ? { publicMessage } : {}),
    }),
  );
  await app.ready();
  return app;
};

const bodyOf = async (app: Awaited<ReturnType<typeof appSending>>) => {
  const res = await app.inject({ method: 'GET', url: '/' });
  const body = res.json() as { error: { code: string; message: string } };
  await app.close();
  return { status: res.statusCode, code: body.error.code, message: body.error.message };
};

describe('sendResult — mensagem pública', () => {
  it('sem publicMessage, 4xx mantém o código como mensagem (comportamento de antes)', async () => {
    assert.deepEqual(await bodyOf(await appSending('x-not-found')), {
      status: 404,
      code: 'x-not-found',
      message: 'x-not-found',
    });
  });

  it('sem publicMessage, 5xx mantém o envelope internal de antes', async () => {
    assert.deepEqual(await bodyOf(await appSending('x-unavailable')), {
      status: 503,
      code: 'internal',
      message: 'An internal error occurred',
    });
  });

  it('com publicMessage, 4xx usa a frase dele e mantém o código no campo code', async () => {
    const app = await appSending(
      'x-not-found',
      (code, status) => `frase ${code} ${String(status)}`,
    );
    assert.deepEqual(await bodyOf(app), {
      status: 404,
      code: 'x-not-found',
      message: 'frase x-not-found 404',
    });
  });

  it('com publicMessage, 5xx usa a frase dele e mantém o code internal', async () => {
    const app = await appSending(
      'x-unavailable',
      (code, status) => `frase ${code} ${String(status)}`,
    );
    assert.deepEqual(await bodyOf(app), {
      status: 503,
      code: 'internal',
      message: 'frase x-unavailable 503',
    });
  });
});
