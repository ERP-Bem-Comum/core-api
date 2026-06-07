/**
 * HTTP-SWAGGER-GUARD — W0 (RED). Finding F1: Swagger/OpenAPI exposto em producao.
 *
 * Intencao do projeto: doc é DEV-ONLY (ERP-INFRA/local/up.sh rotula "Swagger back ... DEV-ONLY").
 * DEVE FALHAR em W0: hoje /docs e /docs/json sao registrados incondicionalmente -> 200 mesmo em
 * NODE_ENV=production. GREEN quando o registro for condicionado a ambiente != production. ASCII puro.
 */

import { describe, it, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';

const originalNodeEnv = process.env['NODE_ENV'];

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = originalNodeEnv;
});

describe('HTTP-SWAGGER-GUARD — doc condicionada a ambiente (F1)', () => {
  it('CA1: NODE_ENV=production -> /docs/json nao exposto (404)', async () => {
    process.env['NODE_ENV'] = 'production';
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(res.statusCode, 404);
    await app.close();
  });

  it('CA2: NODE_ENV=production -> /docs (UI) nao exposto (404)', async () => {
    process.env['NODE_ENV'] = 'production';
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs' });
    assert.equal(res.statusCode, 404);
    await app.close();
  });

  it('CA3: NODE_ENV=development -> /docs/json exposto (200, openapi 3.1.1)', async () => {
    process.env['NODE_ENV'] = 'development';
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(res.statusCode, 200);
    assert.equal((res.json() as { openapi: string }).openapi, '3.1.1');
    await app.close();
  });
});
