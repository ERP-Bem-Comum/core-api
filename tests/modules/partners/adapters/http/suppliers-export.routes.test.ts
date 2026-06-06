/**
 * PARTNERS-SUPPLIER-EXPORT-HTTP — W0 (RED) — GET /api/v1/suppliers/export (CSV).
 *
 * DEVE FALHAR: a rota não existe (404). GREEN quando o W1 entregar a rota que filtra
 * (search/active/categories), serializa via `suppliersToCsv` (util compartilhado, escape
 * anti-fórmula) e responde text/csv + Content-Disposition attachment. `supplier:read`.
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
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'compras.export@example.com';
const NOPERM_EMAIL = 'sem.permissao.export@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

const mk = (over: { name: string; cnpj: string; serviceCategory: string }) =>
  Supplier.register({
    id: SupplierId.generate(),
    name: over.name,
    email: `${over.name.toLowerCase().replace(/[^a-z]/g, '')}@fornecedor.com.br`,
    cnpj: over.cnpj,
    corporateName: `${over.name} LTDA`,
    fantasyName: over.name,
    serviceCategory: over.serviceCategory,
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: NOW,
  });

const record = (
  supplier: SupplierReadRecord['supplier'],
  legacyId: number,
): SupplierReadRecord => ({
  supplier,
  legacyId,
  createdAt: NOW,
  updatedAt: NOW,
});

const seedOf = (
  ...specs: { name: string; cnpj: string; serviceCategory: string }[]
): readonly SupplierReadRecord[] =>
  specs.map((s, i) => {
    const r = mk(s);
    assert.ok(r.ok, `fixture ${s.name}: ${r.ok ? '' : r.error}`);
    return record(r.value.supplier, i + 1);
  });

const makeApp = async (records: readonly SupplierReadRecord[]) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [{ email: READER_EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.read] }],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: { suppliers: records },
  });
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

describe('PARTNERS-SUPPLIER-EXPORT-HTTP — GET /api/v1/suppliers/export', () => {
  it('CA: sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp(
      seedOf({ name: 'Alpha', cnpj: '11.222.333/0001-81', serviceCategory: 'INFORMATICA' }),
    );
    const res = await app.inject({ method: 'GET', url: '/api/v1/suppliers/export' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem supplier:read → 403', async () => {
    const { app, teardown } = await makeApp(
      seedOf({ name: 'Alpha', cnpj: '11.222.333/0001-81', serviceCategory: 'INFORMATICA' }),
    );
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/export',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: filtra por categoria → CSV só com a categoria pedida; headers text/csv + attachment', async () => {
    const { app, teardown } = await makeApp(
      seedOf(
        { name: 'Alpha', cnpj: '11.222.333/0001-81', serviceCategory: 'INFORMATICA' },
        { name: 'Beta', cnpj: '11.444.777/0001-61', serviceCategory: 'AGUA' },
      ),
    );
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/export?categories=INFORMATICA',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.match(String(res.headers['content-type']), /text\/csv/);
    assert.match(String(res.headers['content-disposition']), /attachment/);
    assert.match(res.body, /Alpha/);
    assert.doesNotMatch(res.body, /Beta/);
    await teardown();
  });

  it('CA: célula com gatilho de fórmula é escapada (CSV injection)', async () => {
    const { app, teardown } = await makeApp(
      seedOf({ name: '=SUM(A1)', cnpj: '04.252.011/0001-10', serviceCategory: 'INFORMATICA' }),
    );
    const token = await login(app, READER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/export',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    // escape anti-fórmula do shared/utils/csv.ts: prefixo aspa simples → '=SUM... (entre aspas por conter vírgula)
    assert.match(res.body, /'=SUM/);
    await teardown();
  });
});
