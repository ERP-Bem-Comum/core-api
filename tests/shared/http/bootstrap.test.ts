/**
 * CORE-HTTP-SHELL-RELOCATE — bootstrap do shell HTTP na nova home (ADR-0028).
 *
 * Shell de borda movido para `#src/shared/http/*`; composition root em `src/server.ts`.
 * As 7 asserções sao identicas as do H0 (refactor de movimentacao, sem mudanca de
 * comportamento — CA1). Espelha src/shared/http via subpath import. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as z from 'zod/v4';

import { buildApp } from '#src/shared/http/app.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { ok, err } from '#src/shared/primitives/result.ts';

describe('CORE-HTTP-SHELL-RELOCATE — shell movido para src/shared/http', () => {
  it('CA1: GET /health -> 200 { status: "ok" } sem tocar banco', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok' });
    await app.close();
  });

  it('CA1: excecao nao-tratada -> 500 com envelope estavel e SEM stack vazada', async () => {
    const app = await buildApp();
    app.get('/__boom', () => {
      throw new Error('mensagem-interna-secreta');
    });
    const res = await app.inject({ method: 'GET', url: '/__boom' });
    assert.equal(res.statusCode, 500);
    assert.ok(!res.body.includes('mensagem-interna-secreta'));
    assert.ok(!res.body.toLowerCase().includes('stack'));
    const body = res.json() as { error: { code: string; message: string; requestId: string } };
    assert.equal(body.error.code, 'internal');
    assert.equal(typeof body.error.requestId, 'string');
    await app.close();
  });

  it('CA1: body que viola o schema Zod -> 400 (validacao, nao 500)', async () => {
    const app = await buildApp();
    app.post('/__zod', { schema: { body: z.object({ name: z.string() }) } }, (_req, reply) =>
      reply.send({ ok: true }),
    );
    const res = await app.inject({ method: 'POST', url: '/__zod', payload: { name: 123 } });
    assert.equal(res.statusCode, 400);
    const body = res.json() as { error: { code: string } };
    assert.equal(body.error.code, 'validation');
    await app.close();
  });

  it('CA1: resposta carrega headers do helmet (x-content-type-options: nosniff)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    await app.close();
  });

  it('CA1: rota inexistente -> 404 com o mesmo envelope estavel', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/rota-que-nao-existe' });
    assert.equal(res.statusCode, 404);
    const body = res.json() as { error: { code: string; message: string; requestId: string } };
    assert.equal(body.error.code, 'not-found');
    assert.equal(typeof body.error.requestId, 'string');
    await app.close();
  });

  it('CA1: GET /docs/json -> 200 e openapi === "3.1.1"', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { openapi: string }).openapi, '3.1.1');
    await app.close();
  });

  it('CA1: sendResult traduz Result->HTTP (ok->2xx; err->status mapeado + envelope)', async () => {
    const app = await buildApp();
    app.get('/__ok', (_req, reply) => sendResult(reply, ok({ n: 1 }), { ok: 200 }));
    app.get('/__err', (_req, reply) =>
      sendResult(reply, err('x-not-found'), { errors: { 'x-not-found': 404 } }),
    );

    const r1 = await app.inject({ method: 'GET', url: '/__ok' });
    assert.equal(r1.statusCode, 200);
    assert.deepEqual(r1.json(), { n: 1 });

    const r2 = await app.inject({ method: 'GET', url: '/__err' });
    assert.equal(r2.statusCode, 404);
    assert.equal((r2.json() as { error: { code: string } }).error.code, 'x-not-found');
    await app.close();
  });
});
