/**
 * HTTP-SEC-HARDENING — W0 (RED). Findings F3 (sendResult) e F4 (genReqId).
 *
 * DEVE FALHAR em W0:
 *   - F3: sendResult ainda espelha o code interno em 5xx (deve virar 'internal' + msg generica).
 *   - F4: genReqId ainda aceita x-request-id arbitrario (deve validar formato/comprimento).
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { FastifyPluginAsync } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { err } from '#src/shared/primitives/result.ts';

interface ErrBody {
  error: { code: string; message: string; requestId: string };
}

// Plugin de teste que exercita sendResult com mapeamentos 5xx e 4xx.
const boomPlugin: FastifyPluginAsync = (app) => {
  app.get('/boom-503', (_req, reply) =>
    sendResult(reply, err('invite-mail-failed'), { errors: { 'invite-mail-failed': 503 } }),
  );
  app.get('/boom-422', (_req, reply) =>
    sendResult(reply, err('cpf-invalid-checksum'), { errors: { 'cpf-invalid-checksum': 422 } }),
  );
  return Promise.resolve();
};

describe('HTTP-SEC-HARDENING — F3 sendResult nao vaza componente em 5xx', () => {
  it('CA1: 5xx -> code generico internal + mensagem generica; sem code interno no body', async () => {
    const app = await buildApp({ routes: [boomPlugin] });
    const res = await app.inject({ method: 'GET', url: '/api/v2/boom-503' });
    assert.equal(res.statusCode, 503);
    const body = res.json() as ErrBody;
    assert.equal(body.error.code, 'internal');
    assert.equal(body.error.message, 'An internal error occurred');
    assert.equal(JSON.stringify(body).includes('invite-mail-failed'), false);
    await app.close();
  });

  it('CA2: 4xx preserva o code interno (informativo, seguro)', async () => {
    const app = await buildApp({ routes: [boomPlugin] });
    const res = await app.inject({ method: 'GET', url: '/api/v2/boom-422' });
    assert.equal(res.statusCode, 422);
    const body = res.json() as ErrBody;
    assert.equal(body.error.code, 'cpf-invalid-checksum');
    await app.close();
  });
});

describe('HTTP-SEC-HARDENING — F4 genReqId valida x-request-id do cliente', () => {
  it('CA3: x-request-id gigante nao e refletido (usa UUID gerado)', async () => {
    const app = await buildApp();
    const huge = 'A'.repeat(300);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/rota-inexistente',
      headers: { 'x-request-id': huge },
    });
    assert.equal(res.statusCode, 404);
    const body = res.json() as ErrBody;
    assert.notEqual(body.error.requestId, huge);
    assert.ok(body.error.requestId.length <= 128);
    await app.close();
  });

  it('CA3b: x-request-id com chars perigosos (newline) nao e refletido', async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/rota-inexistente',
      headers: { 'x-request-id': 'abc\r\ninjected: 1' },
    });
    assert.equal(res.statusCode, 404);
    assert.notEqual((res.json() as ErrBody).error.requestId, 'abc\r\ninjected: 1');
    await app.close();
  });

  it('CA4: x-request-id valido e curto e refletido (rastreabilidade legitima)', async () => {
    const app = await buildApp();
    const valid = 'req-abc_123';
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/rota-inexistente',
      headers: { 'x-request-id': valid },
    });
    assert.equal((res.json() as ErrBody).error.requestId, valid);
    await app.close();
  });
});
