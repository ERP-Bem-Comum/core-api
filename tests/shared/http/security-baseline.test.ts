/**
 * CORE-HTTP-SECURITY-BASELINE — W0 (RED)
 *
 * Cobre CA1-CA6 da 001-spec. DEVE FALHAR em W0:
 *   - `buildLoggerOptions` ainda nao existe em `#src/shared/http/app.ts`;
 *   - `HttpConfig`/`readHttpConfig` ainda nao expoem trustProxy/requestTimeout/keepAliveTimeout;
 *   - `buildApp` ainda nao seta requestTimeout nem o header cache-control em /api/v2.
 * GREEN quando o W1 entregar o hardening. CA7 (regressao) fica em bootstrap.test.ts. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { FastifyPluginAsync } from 'fastify';

import { buildApp, buildLoggerOptions } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';

const dummyApiPlugin: FastifyPluginAsync = (app) => {
  app.get('/ping', () => ({ ok: true }));
  return Promise.resolve();
};

describe('CORE-HTTP-SECURITY-BASELINE — config robusta', () => {
  it('CA3: PORT/RATE_LIMIT_MAX invalido cai em default seguro (nunca NaN)', () => {
    const cfg = readHttpConfig({ PORT: 'abc', RATE_LIMIT_MAX: 'x' });
    assert.equal(Number.isNaN(cfg.port), false);
    assert.equal(cfg.port, 3000);
    assert.equal(Number.isNaN(cfg.rateLimitMax), false);
    assert.equal(cfg.rateLimitMax, 200);
  });

  it('CA3: readHttpConfig({}) preserva os defaults atuais', () => {
    const cfg = readHttpConfig({});
    assert.equal(cfg.port, 3000);
    assert.equal(cfg.host, '0.0.0.0');
    assert.deepEqual(cfg.corsOrigins, []);
    assert.equal(cfg.rateLimitMax, 200);
    assert.equal(cfg.rateLimitWindow, '1 minute');
  });

  it('CA4: TRUST_PROXY controla trustProxy (default true; false; CIDR)', () => {
    assert.equal(readHttpConfig({}).trustProxy, true);
    assert.equal(readHttpConfig({ TRUST_PROXY: 'false' }).trustProxy, false);
    assert.equal(readHttpConfig({ TRUST_PROXY: '10.0.0.0/8' }).trustProxy, '10.0.0.0/8');
  });

  it('CA5: requestTimeout/keepAliveTimeout com defaults e overridable', () => {
    const cfg = readHttpConfig({});
    assert.equal(cfg.requestTimeout, 30000);
    assert.equal(cfg.keepAliveTimeout, 72000);
    assert.equal(readHttpConfig({ REQUEST_TIMEOUT_MS: '5000' }).requestTimeout, 5000);
  });
});

describe('CORE-HTTP-SECURITY-BASELINE — logger redact (CA6)', () => {
  it('CA6: buildLoggerOptions inclui paths de secret/cookie/token', () => {
    const opts = buildLoggerOptions({});
    const paths = [...opts.redact];
    for (const p of [
      'req.headers.authorization',
      'req.headers.cookie',
      'res.headers["set-cookie"]',
      'req.headers["x-api-key"]',
      '*.password',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
    ]) {
      assert.ok(paths.includes(p), `redact deve conter ${p}`);
    }
  });
});

describe('CORE-HTTP-SECURITY-BASELINE — app hardening', () => {
  it('CA1: rota /api/v2/* responde com cache-control: no-store', async () => {
    const app = await buildApp({ routes: [dummyApiPlugin] });
    const res = await app.inject({ method: 'GET', url: '/api/v2/ping' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['cache-control'], 'no-store');
    await app.close();
  });

  it('CA1: /health segue 200 (isento de no-store)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { status: 'ok' });
    await app.close();
  });

  it('CA2: headers helmet permanecem (x-content-type-options: nosniff)', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    await app.close();
  });

  it('CA5: keepAliveTimeout repassado ao Fastify (initialConfig)', async () => {
    const app = await buildApp();
    // initialConfig expõe keepAliveTimeout; requestTimeout é coberto pelo unit de config acima
    // (Fastify não publica requestTimeout em initialConfig).
    assert.equal(app.initialConfig.keepAliveTimeout, 72000);
    await app.close();
  });
});
