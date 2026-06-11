/**
 * 010-partner-contract-counts — T008 (W0 RED) — filtro `contractStatus` no grid de Fornecedores
 * (US-002, FR-006/FR-007). Operação DISTINTA da contagem: parametrizada pelo estado escolhido.
 *
 * DEVE FALHAR: `supplierListQuerySchema` ainda não aceita `contractStatus` (strip) e o handler não
 * pré-filtra os ids via `contractorIdsWithContractStatus`/`...AnyContract`. GREEN no T009.
 *
 * Semântica:
 *   - `contractStatus=Active`  → só fornecedores com ≥1 contrato Active.
 *   - `contractStatus=none`    → só fornecedores SEM nenhum contrato (complemento de any-contract).
 *   - ausência                 → não filtra.
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
import {
  makeInMemoryContractCountReadPort,
  type InMemoryContractCountRow,
} from '#src/modules/contracts/public-api/index.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const EMAIL = 'compras.leitor@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

const mk = (name: string, cnpj: string) => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name,
    email: `${name.toLowerCase()}@fornecedor.com.br`,
    cnpj,
    corporateName: `${name} LTDA`,
    fantasyName: name,
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture supplier: ${r.ok ? '' : r.error}`);
  return r.value.supplier;
};

const record = (
  supplier: SupplierReadRecord['supplier'],
  legacyId: number,
): SupplierReadRecord => ({
  supplier,
  legacyId,
  createdAt: NOW,
  updatedAt: NOW,
});

// Alpha: contrato Active. Beta: contrato Cancelled. Gamma: sem contrato.
const alpha = mk('Alpha', '11.222.333/0001-81');
const beta = mk('Beta', '11.444.777/0001-61');
const gamma = mk('Gamma', '04.252.011/0001-10');

const rows: readonly InMemoryContractCountRow[] = [
  { contractorType: 'supplier', contractorId: String(alpha.id), status: 'Active', amendments: 0 },
  { contractorType: 'supplier', contractorId: String(beta.id), status: 'Cancelled', amendments: 0 },
];

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.read] }] },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: { suppliers: [record(alpha, 1), record(beta, 2), record(gamma, 3)] },
    contractCountRead: makeInMemoryContractCountReadPort(rows),
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
    payload: { email: EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

interface Body {
  items: readonly { id: string }[];
  meta: { totalItems: number };
}

const get = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  query: string,
): Promise<Body> => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/suppliers${query}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return res.json() as Body;
};

describe('010 T008 — filtro contractStatus no grid de Fornecedores', () => {
  it('contractStatus=Active → só fornecedores com contrato Active (Alpha)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const body = await get(app, token, '?contractStatus=Active');
    const ids = new Set(body.items.map((i) => i.id));
    assert.equal(body.meta.totalItems, 1);
    assert.ok(ids.has(String(alpha.id)));
    assert.ok(!ids.has(String(beta.id)));
    assert.ok(!ids.has(String(gamma.id)));
    await teardown();
  });

  it('contractStatus=none → só fornecedores sem nenhum contrato (Gamma)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const body = await get(app, token, '?contractStatus=none');
    const ids = new Set(body.items.map((i) => i.id));
    assert.equal(body.meta.totalItems, 1);
    assert.ok(ids.has(String(gamma.id)));
    assert.ok(!ids.has(String(alpha.id)));
    assert.ok(!ids.has(String(beta.id)));
    await teardown();
  });

  it('sem contractStatus → não filtra (3 fornecedores)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const body = await get(app, token, '');
    assert.equal(body.meta.totalItems, 3);
    await teardown();
  });
});
