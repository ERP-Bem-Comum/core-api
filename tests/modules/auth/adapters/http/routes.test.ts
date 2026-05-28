/**
 * AUTH-HTTP-ROUTES (H1a) — W0 (RED) — register + login.
 *
 * DEVE FALHAR: `buildAuthHttpDeps` e a factory `authHttpPlugin(deps)` ainda não existem
 * em `#src/modules/auth/public-api/http.ts` (o plugin atual é a sentinela __ping).
 * GREEN quando o W1 entregar o composition root + as 2 rotas. refresh/logout = H1b.
 * ASCII puro.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { authHttpPlugin, buildAuthHttpDeps } from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const EMAIL = 'user@example.com';

const makeApp = async () => {
  const deps = await buildAuthHttpDeps({ driver: 'memory' });
  return buildApp({ routes: [authHttpPlugin(deps)] });
};

describe('AUTH-HTTP-ROUTES (H1a) — register', () => {
  it('CA1: register email inédito -> 201', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: EMAIL, password: STRONG },
    });
    assert.equal(res.statusCode, 201);
    await app.close();
  });

  it('CA2: register email repetido -> 409 email-already-registered', async () => {
    const app = await makeApp();
    const body = { email: EMAIL, password: STRONG };
    await app.inject({ method: 'POST', url: '/api/v2/auth/register', payload: body });
    const res = await app.inject({ method: 'POST', url: '/api/v2/auth/register', payload: body });
    assert.equal(res.statusCode, 409);
    assert.equal(
      (res.json() as { error: { code: string } }).error.code,
      'email-already-registered',
    );
    await app.close();
  });

  it('CA3: register body inválido -> 400 (validation)', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: 123 },
    });
    assert.equal(res.statusCode, 400);
    assert.equal((res.json() as { error: { code: string } }).error.code, 'validation');
    await app.close();
  });

  it('CA4: register senha fraca -> 422 (policy)', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: 'weak@example.com', password: '123' },
    });
    assert.equal(res.statusCode, 422);
    await app.close();
  });
});

describe('AUTH-HTTP-ROUTES (H1a) — login', () => {
  it('CA5: login com credencial válida -> 200 { accessToken, refreshToken, userId }', async () => {
    const app = await makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: EMAIL, password: STRONG },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: EMAIL, password: STRONG },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { accessToken: string; refreshToken: string; userId: string };
    assert.ok(body.accessToken.length > 0);
    assert.ok(body.refreshToken.length > 0);
    assert.ok(body.userId.length > 0);
    await app.close();
  });

  it('CA6: login com senha errada -> 401 invalid-credentials', async () => {
    const app = await makeApp();
    await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: EMAIL, password: STRONG },
    });
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: EMAIL, password: 'Wr0ng-Passphrase-2026!' },
    });
    assert.equal(res.statusCode, 401);
    assert.equal((res.json() as { error: { code: string } }).error.code, 'invalid-credentials');
    await app.close();
  });

  it('CA6: login com email inexistente -> 401 (mesma resposta, enumeração-safe)', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email: 'ghost@example.com', password: STRONG },
    });
    assert.equal(res.statusCode, 401);
    assert.equal((res.json() as { error: { code: string } }).error.code, 'invalid-credentials');
    await app.close();
  });
});

describe('AUTH-HTTP-ROUTES (H1a) — contrato', () => {
  it('CA11: /docs/json contém register+login e NÃO contém __ping', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/register'));
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/login'));
    assert.equal(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/__ping'), false);
    await app.close();
  });

  it('CA12: resposta de /api/v2/auth/* carrega cache-control: no-store', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: 'cache@example.com', password: STRONG },
    });
    assert.equal(res.headers['cache-control'], 'no-store');
    await app.close();
  });
});

// Sentinela para garantir que o composition memory sobe sem segredo externo (chaves ES256 efêmeras).
before(() => {
  assert.equal(typeof buildAuthHttpDeps, 'function');
  assert.equal(typeof authHttpPlugin, 'function');
});
