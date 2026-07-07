/**
 * BATCH-PARTNERS-SUPPLIERS · W0 (#356) — rota `POST /api/v2/partners/suppliers:batch`.
 *
 * DEVE FALHAR até o W1 entregar `suppliersBatchHttpPlugin`, a rota v2, o port
 * `getSuppliersView(refs)` e o DTO mínimo. Molde: `suppliers-reads.routes.test.ts` (driver memory,
 * seed + login). Contrato #350 / ADR-0049.
 *
 * CA1 items · CA2 missing · CA4 auth/permissão · CA5 minimização (sem bankAccount/pixKey; taxId presente).
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
  suppliersBatchHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { SUPPLIER_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'compras.leitor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');
const MISSING_REF = '00000000-0000-4000-8000-0000000000ff';

const mk = (name: string, cnpj: string, cat: string): ReturnType<typeof Supplier.register> =>
  Supplier.register({
    id: SupplierId.generate(),
    name,
    email: `${name.toLowerCase()}@fornecedor.com.br`,
    cnpj,
    corporateName: `${name} LTDA`,
    fantasyName: name,
    serviceCategory: cat,
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: NOW,
  });

// 2 fornecedores com bankAccount preenchido (p/ provar que o batch NÃO os expõe — CA5).
const seed = (): { records: readonly SupplierReadRecord[]; ids: readonly string[] } => {
  const a = mk('Alpha', '11.222.333/0001-81', 'INFORMATICA');
  const b = mk('Beta', '11.444.777/0001-61', 'AGUA');
  assert.ok(a.ok && b.ok, 'fixture');
  if (!a.ok || !b.ok) throw new Error('fixture');
  const rec = (s: SupplierReadRecord['supplier'], legacyId: number): SupplierReadRecord => ({
    supplier: s,
    legacyId,
    createdAt: NOW,
    updatedAt: NOW,
  });
  return {
    records: [rec(a.value.supplier, 1), rec(b.value.supplier, 2)],
    ids: [String(a.value.supplier.id), String(b.value.supplier.id)],
  };
};

const makeApp = async (records: readonly SupplierReadRecord[]) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [SUPPLIER_PERMISSION.read] },
        { email: NOPERM_EMAIL, password: STRONG, permissions: [] },
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
        plugin: suppliersBatchHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
        }),
        prefix: '/api/v2',
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

const postBatch = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string | null,
  refs: string[],
) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/partners/suppliers:batch',
    ...(token !== null ? { headers: { authorization: `Bearer ${token}` } } : {}),
    payload: { refs },
  });

describe('POST /api/v2/partners/suppliers:batch (#356)', () => {
  it('CA1 — resolve refs existentes → items com identidade mínima', async () => {
    const { records, ids } = seed();
    const { app, teardown } = await makeApp(records);
    try {
      const token = await login(app, READER_EMAIL);
      const res = await postBatch(app, token, [...ids]);
      assert.equal(res.statusCode, 200);
      const body = res.json() as {
        items: { ref: string; name: string; taxId: string; serviceCategory: string }[];
        missing: string[];
      };
      assert.equal(body.items.length, 2);
      assert.deepEqual([...body.missing], []);
      const alpha = body.items.find((i) => i.ref === ids[0]);
      assert.ok(alpha, 'esperava o item Alpha resolvido');
      assert.equal(alpha.name, 'Alpha');
      assert.equal(typeof alpha.taxId, 'string');
      assert.equal(alpha.serviceCategory, 'INFORMATICA');
    } finally {
      await teardown();
    }
  });

  it('CA2 — ref válido sem registro entra em missing (lote não derruba)', async () => {
    const { records, ids } = seed();
    const { app, teardown } = await makeApp(records);
    try {
      const token = await login(app, READER_EMAIL);
      const res = await postBatch(app, token, [ids[0]!, MISSING_REF]);
      assert.equal(res.statusCode, 200);
      const body = res.json() as { items: { ref: string }[]; missing: string[] };
      assert.equal(body.items.length, 1);
      assert.deepEqual([...body.missing], [MISSING_REF]);
    } finally {
      await teardown();
    }
  });

  it('CA5 — minimização: item NUNCA expõe bankAccount/pixKey', async () => {
    const { records, ids } = seed();
    const { app, teardown } = await makeApp(records);
    try {
      const token = await login(app, READER_EMAIL);
      const res = await postBatch(app, token, [...ids]);
      const raw = res.body;
      assert.equal(
        /bankAccount|pixKey|accountNumber|checkDigit/.test(raw),
        false,
        'dado bancário vazou no batch',
      );
    } finally {
      await teardown();
    }
  });

  it('CA4 — sem token → 401', async () => {
    const { records, ids } = seed();
    const { app, teardown } = await makeApp(records);
    try {
      const res = await postBatch(app, null, [...ids]);
      assert.equal(res.statusCode, 401);
    } finally {
      await teardown();
    }
  });

  it('CA4 — autenticado sem supplier:read → 403', async () => {
    const { records, ids } = seed();
    const { app, teardown } = await makeApp(records);
    try {
      const token = await login(app, NOPERM_EMAIL);
      const res = await postBatch(app, token, [...ids]);
      assert.equal(res.statusCode, 403);
    } finally {
      await teardown();
    }
  });
});
