/**
 * AUTH-ME-PERMISSIONS — W0 (RED) — GET /api/v2/auth/me expõe as permissões do usuário.
 *
 * Pedido P1 do front: o `can()` precisa das permissões; hoje /me = { userId } só. DEVE FALHAR:
 * o /me ainda não retorna `permissions`. GREEN quando o W1 listar as permissões do ActiveUser
 * (achata roles→permissions, dedup) e o schema/handler as exporem.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { authHttpPlugin, buildAuthHttpDeps } from '#src/modules/auth/public-api/http.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const OPERATOR = 'operador@example.com';
const BARE = 'bare@example.com';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: OPERATOR,
          password: STRONG,
          permissions: ['collaborator:read', 'collaborator:write'],
        },
      ],
    },
  });
  const app = await buildApp({ routes: [authHttpPlugin(authDeps)] });
  const teardown = async (): Promise<void> => {
    await app.close();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('AUTH-ME-PERMISSIONS — GET /api/v2/auth/me', () => {
  it('sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/auth/me' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('operador → 200 { userId, permissions } com as permissões do RBAC', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, OPERATOR);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { userId: string; permissions: string[] };
    assert.ok(typeof body.userId === 'string' && body.userId.length > 0);
    assert.equal(Array.isArray(body.permissions), true);
    assert.ok(body.permissions.includes('collaborator:read'));
    assert.ok(body.permissions.includes('collaborator:write'));
    await teardown();
  });

  it('usuário sem permissões → 200 { permissions: [] } (degradação graciosa do front)', async () => {
    const { app, teardown } = await makeApp();
    // registra um user "pelado" (sem roles/permissions) e loga
    await app.inject({
      method: 'POST',
      url: '/api/v2/auth/register',
      payload: { email: BARE, password: STRONG },
    });
    const token = await login(app, BARE);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/auth/me',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { permissions: string[] };
    assert.deepEqual(body.permissions, []);
    await teardown();
  });
});
