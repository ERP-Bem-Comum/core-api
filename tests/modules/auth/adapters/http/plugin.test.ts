/**
 * AUTH-HTTP-PLUGIN-EXPORT — W0 (RED)
 *
 * Cobre CA1-CA5 da 001-spec via app.inject. DEVE FALHAR em W0:
 *   - `#src/modules/auth/public-api/http.ts` e `adapters/http/plugin.ts` ainda nao existem.
 * GREEN quando o W1 entregar o plugin + o ponto publico (ADR-0006/0028). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { authHttpPlugin } from '#src/modules/auth/public-api/http.ts';

describe('AUTH-HTTP-PLUGIN-EXPORT — plugin Fastify do auth via public-api/http', () => {
  it('CA1: buildApp({ routes: [authHttpPlugin] }) -> GET /api/v2/auth/__ping = 200 { pong: true }', async () => {
    const app = await buildApp({ routes: [authHttpPlugin] });
    const res = await app.inject({ method: 'GET', url: '/api/v2/auth/__ping' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { pong: true });
    await app.close();
  });

  it('CA2: sem o plugin -> GET /api/v2/auth/__ping = 404 com envelope estavel', async () => {
    const app = await buildApp({ routes: [] });
    const res = await app.inject({ method: 'GET', url: '/api/v2/auth/__ping' });
    assert.equal(res.statusCode, 404);
    const body = res.json() as { error: { code: string; message: string; requestId: string } };
    assert.equal(body.error.code, 'not-found');
    assert.equal(typeof body.error.requestId, 'string');
    await app.close();
  });

  it('CA3: com o plugin -> GET /docs/json contem o path /api/v2/auth/__ping', async () => {
    const app = await buildApp({ routes: [authHttpPlugin] });
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(res.statusCode, 200);
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(
      Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/__ping'),
      'OpenAPI deve conter /api/v2/auth/__ping',
    );
    await app.close();
  });

  it('CA4: encapsulamento -> GET /__ping na raiz = 404 e GET /health = 200', async () => {
    const app = await buildApp({ routes: [authHttpPlugin] });

    const rootPing = await app.inject({ method: 'GET', url: '/__ping' });
    assert.equal(rootPing.statusCode, 404);

    const health = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(health.statusCode, 200);
    assert.deepEqual(health.json(), { status: 'ok' });
    await app.close();
  });

  it('CA5: authHttpPlugin e importavel de public-api/http e e um FastifyPluginAsync', () => {
    assert.equal(typeof authHttpPlugin, 'function');
  });
});
