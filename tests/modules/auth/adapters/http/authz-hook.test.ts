/**
 * AUTH-HTTP-AUTHZ-HOOK (H2) — W0 (RED) — requireAuth + GET /me.
 *
 * DEVE FALHAR: `/me` e `makeRequireAuth`/`makeAuthorize` ainda não existem; `AuthHttpDeps`
 * ainda não expõe `verifyAccessToken`. GREEN quando o W1 entregar o preHandler + rota. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  makeAuthorize,
} from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';

const makeApp = async () => {
  const deps = await buildAuthHttpDeps({ driver: 'memory' });
  return buildApp({ routes: [authHttpPlugin(deps)] });
};

const loginToken = async (
  app: Awaited<ReturnType<typeof makeApp>>,
  email: string,
): Promise<string> => {
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
  return (res.json() as { accessToken: string }).accessToken;
};

describe('AUTH-HTTP-AUTHZ-HOOK (H2) — GET /me protegida', () => {
  it('CA1: Bearer válido -> 200 { userId }', async () => {
    const app = await makeApp();
    const token = await loginToken(app, 'me@example.com');
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.ok((res.json() as { userId: string }).userId.length > 0);
    await app.close();
  });

  it('CA2: sem Authorization -> 401', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/auth/me' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  it('CA3: Bearer inválido -> 401', async () => {
    const app = await makeApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/auth/me',
      headers: { authorization: 'Bearer garbage.token.value' },
    });
    assert.equal(res.statusCode, 401);
    await app.close();
  });
});

describe('AUTH-HTTP-AUTHZ-HOOK (H2) — mecanismo exposto + contrato', () => {
  it('CA4: makeRequireAuth e makeAuthorize são exportados (mecanismo p/ rotas futuras)', () => {
    assert.equal(typeof makeRequireAuth, 'function');
    assert.equal(typeof makeAuthorize, 'function');
  });

  it('CA5: /docs/json contém /api/v2/auth/me', async () => {
    const app = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as { paths: Record<string, unknown> };
    assert.ok(Object.prototype.hasOwnProperty.call(doc.paths, '/api/v2/auth/me'));
    await app.close();
  });
});
