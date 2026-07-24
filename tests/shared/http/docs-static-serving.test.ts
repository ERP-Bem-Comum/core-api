/**
 * AUDIT-FASTIFY-ADVISORIES (#573) — regressão de compatibilidade.
 *
 * O override força `@fastify/static@10` (fix da GHSA-83w8-p2f5-377r) sob `@fastify/swagger-ui@5.2.6`,
 * que declara `@fastify/static ^9.1.2`. Este teste prova que o major 10 NÃO quebra o serviço da UI do
 * /docs: o swagger-ui usa o @fastify/static para servir os assets, e a API `register(root/prefix)` é
 * estável entre 9 e 10. Em dev, `GET /docs` deve servir a UI (200 ou 302 para o index).
 */

import { describe, it, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';

const originalNodeEnv = process.env['NODE_ENV'];

afterEach(() => {
  if (originalNodeEnv === undefined) delete process.env['NODE_ENV'];
  else process.env['NODE_ENV'] = originalNodeEnv;
});

describe('#573 — /docs (UI) servida pelo @fastify/static@10', () => {
  it('NODE_ENV=development -> GET /docs serve a UI (200/302), sem quebra do major 10', async () => {
    process.env['NODE_ENV'] = 'development';
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/docs' });
    await app.close();
    assert.ok(
      [200, 302].includes(res.statusCode),
      `esperado 200/302 ao servir a UI do /docs, veio ${String(res.statusCode)}`,
    );
  });
});
