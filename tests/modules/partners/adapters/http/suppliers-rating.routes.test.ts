/**
 * PAR-SUPPLIER-AVALIACAO — W0 (RED) — borda HTTP da avaliação de fornecedor.
 *
 * DEVE FALHAR: catálogo de ratings e os campos no detail/body ainda não existem. GREEN no W1.
 *
 * Cobre: catálogo `GET /suppliers/service-ratings` (popular o select — CA2); detail expõe
 * `serviceRating`/`ratingComment` (CA1); POST com rating inválido → 422 (domínio é autoridade).
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
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const OPERATOR = 'compras@example.com';
const NOW = new Date('2026-06-01T12:00:00.000Z');

const mkSupplier = (serviceRating: string | null, ratingComment: string | null) => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Alpha',
    email: 'alpha@x.com',
    cnpj: '11.222.333/0001-81',
    corporateName: 'Alpha LTDA',
    fantasyName: 'Alpha',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    serviceRating,
    ratingComment,
    registeredAt: NOW,
  });
  if (!r.ok) throw new Error(`register: ${r.error}`);
  return r.value.supplier;
};

const record = (s: SupplierReadRecord['supplier']): SupplierReadRecord => ({
  supplier: s,
  legacyId: null,
  createdAt: NOW,
  updatedAt: NOW,
});

const makeApp = async (records: readonly SupplierReadRecord[]) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: OPERATOR,
          password: STRONG,
          permissions: [SUPPLIER_PERMISSION.read, SUPPLIER_PERMISSION.write],
        },
      ],
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: OPERATOR, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('SUPPLIERS-RATING — catálogo', () => {
  it('GET /suppliers/service-ratings → 200 com os 4 níveis', async () => {
    const { app, teardown } = await makeApp([]);
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers/service-ratings',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), ['RUIM', 'REGULAR', 'BOM', 'OTIMO']);
    await teardown();
  });
});

describe('SUPPLIERS-RATING — detail', () => {
  it('GET /suppliers/:id expõe serviceRating e ratingComment', async () => {
    const s = mkSupplier('BOM', 'Entrega pontual.');
    const { app, teardown } = await makeApp([record(s)]);
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/suppliers/${String(s.id)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['serviceRating'], 'BOM');
    assert.equal(body['ratingComment'], 'Entrega pontual.');
    await teardown();
  });

  it('detail de fornecedor sem avaliação → serviceRating/ratingComment null', async () => {
    const s = mkSupplier(null, null);
    const { app, teardown } = await makeApp([record(s)]);
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/suppliers/${String(s.id)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['serviceRating'], null);
    assert.equal(body['ratingComment'], null);
    await teardown();
  });
});

describe('SUPPLIERS-RATING — POST validação', () => {
  it('POST /suppliers com serviceRating inválido → 422', async () => {
    const { app, teardown } = await makeApp([]);
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/suppliers',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: 'Novo',
        email: 'novo@x.com',
        cnpj: '11222333000181',
        corporateName: 'Novo LTDA',
        fantasyName: 'Novo',
        serviceCategory: 'INFORMATICA',
        bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
        pixKey: null,
        serviceRating: 'EXCELENTE',
        ratingComment: null,
      },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});
