/**
 * #1022 — Fornecedor pessoa física pela borda HTTP: os critérios de aceite da issue.
 *
 * POST/PUT aceitam `document` (CPF ou CNPJ) e o alias deprecated `cnpj`; GET devolve `document`,
 * `personType` e o alias `cnpj`; na PF, `corporateName`/`fantasyName` são `null`. Documentos
 * sintéticos (DV calculado), nunca dado real de cadastro.
 *
 * No driver memory o leitor (GET) só vê o `seed` — não as escritas do POST. Por isso as escritas
 * são verificadas pelo status, e as leituras (detalhe, busca) partem de fornecedores semeados.
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
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'compras.editor@example.com';
const DIRECTOR_EMAIL = 'compras.diretor@example.com';
const CPF = '12345678909';
const CNPJ = '11222333000181';

type App = Awaited<ReturnType<typeof buildApp>>;

const individualBody = (over: Record<string, unknown> = {}) => ({
  name: 'Maria da Silva',
  email: 'maria@example.com',
  document: CPF,
  serviceCategory: 'INFORMATICA',
  bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
  pixKey: null,
  ...over,
});

const companyBody = (over: Record<string, unknown> = {}) => ({
  ...individualBody({ document: CNPJ, email: 'contato@fornecedor.com.br' }),
  name: 'Fornecedor X',
  corporateName: 'Fornecedor X LTDA',
  fantasyName: 'FX',
  ...over,
});

const NOW = new Date('2026-10-01T12:00:00.000Z');

type RegisterInput = Parameters<typeof Supplier.register>[0];

// Mesmo payload do POST, passado direto ao domínio: os bodies acima são `Record<string, unknown>`
// (aceitam campos inválidos de propósito), daí a conversão explícita para o input do `register`.
const seedRecord = (body: Record<string, unknown>): SupplierReadRecord => {
  const input = {
    corporateName: null,
    fantasyName: null,
    ...body,
    id: SupplierId.generate(),
    registeredAt: NOW,
  } as unknown as RegisterInput;
  const r = Supplier.register(input);
  assert.ok(r.ok, `seed inválido: ${r.ok ? '' : r.error}`);
  return { supplier: r.value.supplier, legacyId: null, createdAt: NOW, updatedAt: NOW };
};

const makeApp = async (suppliers: readonly SupplierReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [SUPPLIER_PERMISSION.read, SUPPLIER_PERMISSION.write],
        },
        {
          email: DIRECTOR_EMAIL,
          password: STRONG,
          permissions: [
            SUPPLIER_PERMISSION.read,
            SUPPLIER_PERMISSION.write,
            'supplier:edit-sensitive',
          ],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: { suppliers } });
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
  const login = async (email: string): Promise<string> => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v2/auth/login',
      payload: { email, password: STRONG },
    });
    return (res.json() as { accessToken: string }).accessToken;
  };
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, login, teardown };
};

const post = (app: App, token: string, payload: Record<string, unknown>) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/suppliers',
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

const put = (app: App, token: string, id: string, payload: Record<string, unknown>) =>
  app.inject({
    method: 'PUT',
    url: `/api/v1/suppliers/${id}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

const getDetail = async (app: App, token: string, id: string) => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v1/suppliers/${id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json() as Record<string, unknown>;
};

const idFrom = (res: Awaited<ReturnType<typeof post>>): string =>
  (res.headers['location'] ?? '').slice('/api/v1/suppliers/'.length);

const errorCode = (res: Awaited<ReturnType<typeof post>>): string =>
  (res.json() as { error: { code: string } }).error.code;

describe('#1022 — fornecedor pessoa física (POST/GET/PUT /api/v1/suppliers)', () => {
  it('POST com CPF válido e sem razão social/nome fantasia → 201', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(app, await login(WRITER_EMAIL), individualBody());
      assert.equal(res.statusCode, 201, res.body);
      assert.notEqual(idFrom(res), '');
    } finally {
      await teardown();
    }
  });

  it('GET de um fornecedor PF devolve document, personType PF e razão social/fantasia null', async () => {
    const pf = seedRecord(individualBody());
    const { app, login, teardown } = await makeApp([pf]);
    try {
      const detail = await getDetail(app, await login(WRITER_EMAIL), String(pf.supplier.id));
      assert.equal(detail['document'], CPF);
      assert.equal(detail['personType'], 'PF');
      assert.equal(detail['cnpj'], CPF, 'alias deprecated espelha `document` por um ciclo');
      assert.equal(detail['corporateName'], null);
      assert.equal(detail['fantasyName'], null);
    } finally {
      await teardown();
    }
  });

  it('POST com CPF de DV errado → 422 invalid-supplier-document', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(
        app,
        await login(WRITER_EMAIL),
        individualBody({ document: '12345678900' }),
      );
      assert.equal(res.statusCode, 422);
      assert.equal(errorCode(res), 'invalid-supplier-document');
    } finally {
      await teardown();
    }
  });

  it('POST com CPF e razão social → 422 supplier-corporate-name-not-allowed-for-pf', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(
        app,
        await login(WRITER_EMAIL),
        individualBody({ corporateName: 'Maria LTDA' }),
      );
      assert.equal(res.statusCode, 422);
      assert.equal(errorCode(res), 'supplier-corporate-name-not-allowed-for-pf');
    } finally {
      await teardown();
    }
  });

  it('POST com CPF e nome fantasia → 422 supplier-fantasy-name-not-allowed-for-pf', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(
        app,
        await login(WRITER_EMAIL),
        individualBody({ fantasyName: 'Maria' }),
      );
      assert.equal(res.statusCode, 422);
      assert.equal(errorCode(res), 'supplier-fantasy-name-not-allowed-for-pf');
    } finally {
      await teardown();
    }
  });

  it('POST com CNPJ sem razão social → 422 supplier-corporate-name-required', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(
        app,
        await login(WRITER_EMAIL),
        companyBody({ corporateName: undefined }),
      );
      assert.equal(res.statusCode, 422);
      assert.equal(errorCode(res), 'supplier-corporate-name-required');
    } finally {
      await teardown();
    }
  });

  it('POST com o alias `cnpj` continua funcionando (PJ)', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const token = await login(WRITER_EMAIL);
      const { document: _document, ...withoutDocument } = companyBody();
      const res = await post(app, token, { ...withoutDocument, cnpj: CNPJ });
      assert.equal(res.statusCode, 201, res.body);
    } finally {
      await teardown();
    }
  });

  it('GET de um fornecedor PJ devolve personType PJ e o alias `cnpj`', async () => {
    const pj = seedRecord(companyBody());
    const { app, login, teardown } = await makeApp([pj]);
    try {
      const detail = await getDetail(app, await login(WRITER_EMAIL), String(pj.supplier.id));
      assert.equal(detail['document'], CNPJ);
      assert.equal(detail['cnpj'], CNPJ);
      assert.equal(detail['personType'], 'PJ');
      assert.equal(detail['corporateName'], 'Fornecedor X LTDA');
    } finally {
      await teardown();
    }
  });

  it('POST sem `document` e sem `cnpj` → 400', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const { document: _document, ...withoutDocument } = individualBody();
      const res = await post(app, await login(WRITER_EMAIL), withoutDocument);
      assert.equal(res.statusCode, 400);
    } finally {
      await teardown();
    }
  });

  it('POST com `document` e `cnpj` divergentes → 400', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(
        app,
        await login(WRITER_EMAIL),
        companyBody({ cnpj: '11444777000161' }),
      );
      assert.equal(res.statusCode, 400);
    } finally {
      await teardown();
    }
  });

  it('POST com documento de 12 caracteres → 400 (shape: 11 ou 14)', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const res = await post(
        app,
        await login(WRITER_EMAIL),
        individualBody({ document: '123456789012' }),
      );
      assert.equal(res.statusCode, 400);
    } finally {
      await teardown();
    }
  });

  it('CPF duplicado → 409 register-supplier-document-duplicate', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const token = await login(WRITER_EMAIL);
      assert.equal((await post(app, token, individualBody())).statusCode, 201);
      const dup = await post(app, token, individualBody({ email: 'outra@example.com' }));
      assert.equal(dup.statusCode, 409);
      assert.equal(errorCode(dup), 'register-supplier-document-duplicate');
    } finally {
      await teardown();
    }
  });

  it('busca da lista encontra o fornecedor PF pelo CPF (com ou sem máscara)', async () => {
    const { app, login, teardown } = await makeApp([
      seedRecord(individualBody()),
      seedRecord(companyBody()),
    ]);
    try {
      const token = await login(WRITER_EMAIL);
      for (const search of [CPF, '123.456.789-09']) {
        const res = await app.inject({
          method: 'GET',
          url: `/api/v1/suppliers?search=${encodeURIComponent(search)}`,
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(res.statusCode, 200, res.body);
        const items = (res.json() as { items: { document: string }[] }).items;
        assert.deepEqual(
          items.map((i) => i.document),
          [CPF],
          `search=${search}`,
        );
      }
    } finally {
      await teardown();
    }
  });

  it('PUT trocando PF → PJ sem supplier:edit-sensitive → 403', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const token = await login(WRITER_EMAIL);
      const id = idFrom(await post(app, token, individualBody()));
      const res = await put(app, token, id, companyBody({ email: 'maria@example.com' }));
      assert.equal(res.statusCode, 403);
      assert.equal(errorCode(res), 'edit-supplier-sensitive-forbidden');
    } finally {
      await teardown();
    }
  });

  it('PUT trocando PF → PJ com supplier:edit-sensitive → 200 e passa a exigir razão social', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const writer = await login(WRITER_EMAIL);
      const director = await login(DIRECTOR_EMAIL);
      const id = idFrom(await post(app, writer, individualBody()));

      const missing = await put(app, director, id, companyBody({ corporateName: null }));
      assert.equal(missing.statusCode, 422);
      assert.equal(errorCode(missing), 'supplier-corporate-name-required');

      const res = await put(app, director, id, companyBody());
      assert.equal(res.statusCode, 200, res.body);
    } finally {
      await teardown();
    }
  });

  it('PUT de PF sem trocar o documento não exige supplier:edit-sensitive', async () => {
    const { app, login, teardown } = await makeApp();
    try {
      const token = await login(WRITER_EMAIL);
      const id = idFrom(await post(app, token, individualBody()));
      const res = await put(app, token, id, individualBody({ name: 'Maria S. Souza' }));
      assert.equal(res.statusCode, 200, res.body);
    } finally {
      await teardown();
    }
  });
});
