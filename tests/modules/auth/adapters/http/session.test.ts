/**
 * AUTH-HTTP-ROUTES-SESSION (H1b) — W0 (RED) — refresh + logout.
 *
 * DEVE FALHAR: as rotas /refresh e /logout ainda não existem no plugin (só register/login).
 * GREEN quando o W1 adicionar as 2 rotas (reusa o composition root do H1a). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { authHttpPlugin, buildAuthHttpDeps } from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';

const makeApp = async () => {
  const deps = await buildAuthHttpDeps({ driver: 'memory' });
  return buildApp({ routes: [authHttpPlugin(deps)] });
};

const seedAndLogin = async (
  app: Awaited<ReturnType<typeof makeApp>>,
  email: string,
): Promise<{ accessToken: string; refreshToken: string; userId: string }> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return res.json() as { accessToken: string; refreshToken: string; userId: string };
};

describe('AUTH-HTTP-ROUTES-SESSION (H1b) — refresh', () => {
  it('CA8: refresh válido -> 200 com tokens novos (refresh rotacionado)', async () => {
    const app = await makeApp();
    const login = await seedAndLogin(app, 'refresh@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/refresh',
      payload: { refreshToken: login.refreshToken },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { accessToken: string; refreshToken: string; userId: string };
    assert.ok(body.accessToken.length > 0);
    assert.ok(body.refreshToken.length > 0);
    assert.notEqual(body.refreshToken, login.refreshToken);
    await app.close();
  });

  it('CA9: refresh inexistente/garbage -> 401', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/refresh',
      payload: { refreshToken: 'garbage-token-that-does-not-exist' },
    });
    assert.equal(res.statusCode, 401);
    await app.close();
  });
});

describe('AUTH-HTTP-ROUTES-SESSION (H1b) — logout', () => {
  it('CA10a: logout com refresh válido -> 204 (sem body)', async () => {
    const app = await makeApp();
    const login = await seedAndLogin(app, 'logout@example.com');
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/logout',
      payload: { refreshToken: login.refreshToken },
    });
    assert.equal(res.statusCode, 204);
    assert.equal(res.body, '');
    await app.close();
  });

  it('CA10b: logout repetido -> 204 (idempotente)', async () => {
    const app = await makeApp();
    const login = await seedAndLogin(app, 'logout2@example.com');
    const body = { refreshToken: login.refreshToken };
    await app.inject({ method: 'POST', url: '/api/v2/auth/logout', payload: body });
    const res = await app.inject({ method: 'POST', url: '/api/v2/auth/logout', payload: body });
    assert.equal(res.statusCode, 204);
    await app.close();
  });
});

describe('AUTH-HTTP-ROUTES-SESSION (H1b) — contrato', () => {
  it('CA11: /docs/json contém refresh + logout', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/refresh'));
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/logout'));
    await app.close();
  });
});
