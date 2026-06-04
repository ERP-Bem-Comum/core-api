/**
 * SUPPLIERS-HTTP-READS (S1) — W0 (RED) — GET /api/v1/suppliers (lista+filtros) + GET /:id.
 *
 * DEVE FALHAR: `suppliersHttpPlugin`, `SUPPLIER_PERMISSION`, o `SupplierReader` no composition
 * (`seed.suppliers`, `getSupplierById`, `listSupplierRecords`) e os schemas/DTO de supplier ainda
 * nao existem. GREEN quando o W1 entregar o recurso suppliers (espelha P1a/P1b de colaboradores).
 *
 * Driver memory: suppliers semeados como read-records (agregado + legacyId/timestamps).
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
const READER_EMAIL = 'compras.leitor@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';

const mk = (over: {
  name: string;
  cnpj: string;
  serviceCategory: string;
}): ReturnType<typeof Supplier.register> => {
  return Supplier.register({
    id: SupplierId.generate(),
    name: over.name,
    email: `${over.name.toLowerCase()}@fornecedor.com.br`,
    cnpj: over.cnpj,
    corporateName: `${over.name} LTDA`,
    fantasyName: over.name,
    serviceCategory: over.serviceCategory,
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: NOW,
  });
};

const record = (
  supplier: SupplierReadRecord['supplier'],
  legacyId: number,
): SupplierReadRecord => ({ supplier, legacyId, createdAt: NOW, updatedAt: NOW });

// 1 ativo (INFORMATICA) + 1 inativo (AGUA). CNPJs validos distintos.
const seedRecords = (): readonly SupplierReadRecord[] => {
  const ativoR = mk({ name: 'Alpha', cnpj: '11.222.333/0001-81', serviceCategory: 'INFORMATICA' });
  assert.ok(ativoR.ok, `fixture ativo: ${ativoR.ok ? '' : ativoR.error}`);
  const baseInativo = mk({ name: 'Beta', cnpj: '11.444.777/0001-61', serviceCategory: 'AGUA' });
  assert.ok(baseInativo.ok, `fixture inativo: ${baseInativo.ok ? '' : baseInativo.error}`);
  const deact = Supplier.deactivate(baseInativo.value.supplier, NOW);
  assert.ok(deact.ok, `fixture deactivate: ${deact.ok ? '' : deact.error}`);
  return [record(ativoR.value.supplier, 1), record(deact.value.supplier, 2)];
};

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

interface Meta {
  totalItems: number;
}
interface Body {
  items: readonly Record<string, unknown>[];
  meta: Meta;
}

const listing = async (
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

describe('SUPPLIERS-HTTP-READS (S1) — GET /api/v1/suppliers', () => {
  it('CA: sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    assert.equal((await app.inject({ method: 'GET', url: '/api/v1/suppliers' })).statusCode, 401);
    await teardown();
  });

  it('CA: autenticado sem supplier:read -> 403', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/suppliers',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA: 200 com meta legado e item = detalhe (legacyId, cnpj, payment target)', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app, READER_EMAIL);
    const body = await listing(app, token, '');
    assert.equal(body.meta.totalItems, 2);
    const first = body.items[0]!;
    assert.ok('legacyId' in first);
    assert.ok('cnpj' in first);
    assert.ok('serviceCategory' in first);
    assert.ok('active' in first);
    await teardown();
  });

  it('CA: filtro categories=INFORMATICA -> 1; active=0 -> 1; search=Alpha -> 1', async () => {
    const { app, teardown } = await makeApp(seedRecords());
    const token = await login(app, READER_EMAIL);
    assert.equal((await listing(app, token, '?categories=INFORMATICA')).meta.totalItems, 1);
    assert.equal((await listing(app, token, '?active=0')).meta.totalItems, 1);
    assert.equal((await listing(app, token, '?active=1')).meta.totalItems, 1);
    assert.equal((await listing(app, token, '?search=Alpha')).meta.totalItems, 1);
    await teardown();
  });
});

describe('SUPPLIERS-HTTP-READS (S1) — GET /api/v1/suppliers/:id', () => {
  it('CA: existente -> 200 (cnpj normalizado + serviceCategory)', async () => {
    const records = seedRecords();
    const { app, teardown } = await makeApp(records);
    const token = await login(app, READER_EMAIL);
    const id = String(records[0]!.supplier.id);
    const res = await app.inject({
      method: 'GET',
      url: `/api/v1/suppliers/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const dto = res.json() as {
      id: string;
      cnpj: string;
      serviceCategory: string;
      active: boolean;
    };
    assert.equal(dto.id, id);
    assert.equal(dto.cnpj, '11222333000181');
    assert.equal(dto.serviceCategory, 'INFORMATICA');
    assert.equal(dto.active, true);
    await teardown();
  });

  it('CA: inexistente -> 404; :id nao-UUID -> 400', async () => {
    const { app, teardown } = await makeApp([]);
    const token = await login(app, READER_EMAIL);
    const hdr = { authorization: `Bearer ${token}` };
    assert.equal(
      (
        await app.inject({
          method: 'GET',
          url: `/api/v1/suppliers/${UUID_INEXISTENTE}`,
          headers: hdr,
        })
      ).statusCode,
      404,
    );
    assert.equal(
      (await app.inject({ method: 'GET', url: '/api/v1/suppliers/nao-uuid', headers: hdr }))
        .statusCode,
      400,
    );
    await teardown();
  });
});

describe('SUPPLIERS-HTTP-READS (S1) — composition', () => {
  it('CA: buildPartnersHttpDeps memory com seed.suppliers expoe getSupplierById + listSupplierRecords', async () => {
    const records = seedRecords();
    const deps = await buildPartnersHttpDeps({
      driver: 'memory',
      seed: { suppliers: records },
    });
    const byId = await deps.getSupplierById(String(records[0]!.supplier.id));
    assert.equal(byId.ok, true);
    const all = await deps.listSupplierRecords();
    assert.equal(all.ok, true);
    await deps.shutdown();
  });
});
