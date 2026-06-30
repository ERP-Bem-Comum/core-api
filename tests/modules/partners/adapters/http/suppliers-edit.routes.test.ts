/**
 * SUPPLIERS-HTTP-EDIT — W0 (RED) — PUT /api/v1/suppliers/:id com RBAC elevado p/ campo vital.
 *
 * DEVE FALHAR: PUT, `editSupplier` no composition, `hasPermission` no SuppliersHttpHooks e
 * `updateSupplierBodySchema` ainda não existem. GREEN no W1. Vital = cnpj; payment-target é
 * editável via `supplier:write` (não-vital). POST→PUT no mesmo writer (memory).
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
const DIRECTOR_EMAIL = 'compras.diretor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const CNPJ_A = '11222333000181';
const CNPJ_B = '11444777000161';

const body = (over: Record<string, unknown> = {}) => ({
  name: 'Fornecedor X',
  email: 'contato@fornecedor.com.br',
  cnpj: CNPJ_A,
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
  ...over,
});

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: WRITER_EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.write] },
        {
          email: DIRECTOR_EMAIL,
          password: STRONG,
          permissions: [SUPPLIER_PERMISSION.write, 'supplier:edit-sensitive'],
        },
      ],
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

const create = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  cnpj: string,
): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v1/suppliers',
    headers: { authorization: `Bearer ${token}` },
    payload: body({ cnpj, email: `c${cnpj}@fornecedor.com.br` }),
  });
  return (res.headers['location'] ?? '').slice('/api/v1/suppliers/'.length);
};

const put = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  id: string,
  payload: Record<string, unknown>,
) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/suppliers/${id}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

describe('SUPPLIERS-HTTP-EDIT — PUT /api/v1/suppliers/:id', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    assert.equal(
      (
        await app.inject({
          method: 'PUT',
          url: `/api/v1/suppliers/${UUID_INEXISTENTE}`,
          payload: body(),
        })
      ).statusCode,
      401,
    );
    await teardown();
  });

  it('CA: sem supplier:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 403);
    await teardown();
  });

  it('CA: :id não-UUID -> 400; inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    assert.equal((await put(app, token, 'nao-uuid', body())).statusCode, 400);
    assert.equal((await put(app, token, UUID_INEXISTENTE, body())).statusCode, 404);
    await teardown();
  });

  it('CA: write, sem mudar cnpj (muda name + troca payment p/ pix) -> 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, CNPJ_A);
    const res = await put(
      app,
      token,
      id,
      body({
        name: 'Fornecedor X Renomeado',
        bankAccount: null,
        pixKey: { keyType: 'email', key: 'pix@fornecedor.com.br' },
      }),
    );
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA: write, mudando cnpj -> 403 (sensitive-forbidden)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, CNPJ_A);
    assert.equal(await put(app, token, id, body({ cnpj: CNPJ_B })).then((r) => r.statusCode), 403);
    await teardown();
  });

  it('CA: director, mudando cnpj -> 200; cnpj novo já usado -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, DIRECTOR_EMAIL);
    const id = await create(app, token, CNPJ_A);
    assert.equal(await put(app, token, id, body({ cnpj: CNPJ_B })).then((r) => r.statusCode), 200);
    const other = await create(app, token, CNPJ_A); // CNPJ_A livre de novo (id mudou p/ B)
    assert.equal(
      await put(app, token, other, body({ cnpj: CNPJ_B })).then((r) => r.statusCode),
      409,
    );
    await teardown();
  });

  it('CA: sem payment target -> 422; email inválido -> 422; cnpj curto -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const id = await create(app, token, CNPJ_A);
    assert.equal(
      await put(app, token, id, body({ bankAccount: null, pixKey: null })).then(
        (r) => r.statusCode,
      ),
      422,
    );
    assert.equal(await put(app, token, id, body({ email: 'nope' })).then((r) => r.statusCode), 422);
    assert.equal(await put(app, token, id, body({ cnpj: '123' })).then((r) => r.statusCode), 400);
    await teardown();
  });
});
