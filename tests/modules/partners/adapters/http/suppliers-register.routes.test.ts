/**
 * SUPPLIERS-HTTP-REGISTER (S2) — W0 (RED) — POST /api/v1/suppliers.
 *
 * DEVE FALHAR: a rota POST /suppliers e o `registerSupplier` no composition (writer) ainda nao
 * existem. GREEN quando o W1 entregar: writer repo, POST (201 + Location), body schema com payment
 * target, mapeamento erro->HTTP (409 cnpj-duplicate, 422 invariante/payment-target, 400 Zod).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  suppliersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { SUPPLIER_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'compras.editor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';

const VALID_BODY = {
  name: 'Fornecedor X',
  email: 'contato@fornecedor.com.br',
  cnpj: '11222333000181',
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [{ email: WRITER_EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.write] }],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory' });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: suppliersHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
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

const registerAndLogin = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  email: string,
): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

const postSupplier = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown>,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/suppliers',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });

describe('SUPPLIERS-HTTP-REGISTER (S2) — POST /api/v1/suppliers', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      payload: VALID_BODY,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem supplier:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await postSupplier(app, token, VALID_BODY);
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: body válido -> 201 + Location /api/v1/suppliers/{uuid}', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await postSupplier(app, token, VALID_BODY);
    assert.equal(res.statusCode, 201);
    const location = res.headers['location'] ?? '';
    assert.ok(location.startsWith('/api/v1/suppliers/'));
    await teardown();
  });

  it('CA: CNPJ duplicado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    await postSupplier(app, token, VALID_BODY);
    const dup = await postSupplier(app, token, {
      ...VALID_BODY,
      email: 'outro@fornecedor.com.br',
    });
    assert.equal(dup.statusCode, 409);
    await teardown();
  });

  it('CA: shape inválido (cnpj curto) -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await postSupplier(app, token, { ...VALID_BODY, cnpj: '123' });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA: CNPJ 14-díg DV inválido -> 422 (domínio)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await postSupplier(app, token, { ...VALID_BODY, cnpj: '11111111111111' });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA: sem payment target (bankAccount e pixKey null) -> 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await postSupplier(app, token, { ...VALID_BODY, bankAccount: null, pixKey: null });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});
