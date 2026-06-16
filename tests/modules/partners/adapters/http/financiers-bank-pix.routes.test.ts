/**
 * FINANCIERS-HTTP-BANK-PIX (trilha B da issue #40) — W0 (RED) — banco/PIX em /api/v1/financiers.
 *
 * DEVE FALHAR: o body schema de create/update ainda não tem `bankAccount`/`pixKey`, o detail
 * schema/DTO não os serializa, e o domínio/use case não os repassa. GREEN no W1.
 *
 * Campos OPCIONAIS (Financier NÃO tem invariante "ao menos um destino", ao contrário de Supplier).
 * Reflexão GET-após-POST em memory usa store de reader distinto (read-after-write só no smoke MySQL),
 * então CA1/CA4 de detalhe semeiam o reader; o write-path (CA2/CA3) é validado direto pela rota.
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
  financiersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import { FINANCIER_PERMISSION } from '#src/modules/partners/public-api/permissions.ts';
import type { FinancierReadRecord } from '#src/modules/partners/application/ports/financier-reader.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';

const NOW = new Date('2026-01-10T08:00:00.000Z');
const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'fin.leitor@example.com';
const WRITER_EMAIL = 'fin.editor@example.com';

const BANK = { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' };
const PIX = { keyType: 'email', key: 'financeiro@banco.com.br' };

const VALID_BODY = {
  name: 'Banco Apoio',
  corporateName: 'Banco Apoio S.A.',
  legalRepresentative: 'Maria Diretora',
  cnpj: '11222333000181',
  telephone: '+5511999998888',
  address: 'Av. Central, 1000',
};

// Record de reader com banco/PIX preenchidos (CA1 — detalhe serializa ambos).
const seedRecordWithBankPix = (): { id: string; record: FinancierReadRecord } => {
  const id = FinancierId.generate();
  const r = Financier.register({
    id,
    ...VALID_BODY,
    bankAccount: BANK,
    pixKey: PIX,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return {
    id: String(id),
    record: { financier: r.value.financier, legacyId: 7, createdAt: NOW, updatedAt: NOW },
  };
};

const makeApp = async (financiers: readonly FinancierReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [FINANCIER_PERMISSION.read] },
        { email: WRITER_EMAIL, password: STRONG, permissions: [FINANCIER_PERMISSION.write] },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: { financiers } });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: financiersHttpPlugin(partnersDeps, {
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

const post = (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  body: Record<string, unknown>,
) =>
  app.inject({
    method: 'POST',
    url: '/api/v1/financiers',
    headers: { authorization: `Bearer ${token}` },
    payload: body,
  });

describe('FINANCIERS-HTTP-BANK-PIX — POST com banco/PIX', () => {
  it('CA1 — POST com bankAccount e pixKey válidos → 201 + Location', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await post(app, token, { ...VALID_BODY, bankAccount: BANK, pixKey: PIX });
    assert.equal(res.statusCode, 201);
    assert.ok((res.headers['location'] ?? '').startsWith('/api/v1/financiers/'));
    await teardown();
  });

  it('CA2 — POST sem bankAccount nem pixKey → 201 (campos opcionais no Financier)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await post(app, token, VALID_BODY);
    assert.equal(res.statusCode, 201);
    await teardown();
  });

  it('CA2 — POST com ambos null explícitos → 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await post(app, token, { ...VALID_BODY, bankAccount: null, pixKey: null });
    assert.equal(res.statusCode, 201);
    await teardown();
  });

  it('CA3 — pixKey.keyType fora do enum → 422 (domínio: invalid-pix-key)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await post(app, token, {
      ...VALID_BODY,
      pixKey: { keyType: 'iban', key: 'algo' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA5 — bankAccount com bank em branco → 422 (domínio: invalid-bank-account)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await post(app, token, {
      ...VALID_BODY,
      bankAccount: { ...BANK, bank: '' },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });
});

describe('FINANCIERS-HTTP-BANK-PIX — GET detalhe serializa banco/PIX', () => {
  it('CA1 — GET /:id retorna bankAccount e pixKey idênticos ao persistido', async () => {
    const { id, record } = seedRecordWithBankPix();
    const { app, teardown } = await makeApp([record]);
    const token = await login(app, READER_EMAIL);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/financiers/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(detail.statusCode, 200);
    const dto = detail.json() as {
      bankAccount: typeof BANK | null;
      pixKey: typeof PIX | null;
    };
    assert.deepEqual(dto.bankAccount, BANK);
    assert.deepEqual(dto.pixKey, PIX);
    await teardown();
  });

  it('CA2 — detalhe sem destino retorna bankAccount:null e pixKey:null', async () => {
    const id = FinancierId.generate();
    const r = Financier.register({
      id,
      ...VALID_BODY,
      bankAccount: null,
      pixKey: null,
      registeredAt: NOW,
    });
    assert.ok(r.ok);
    if (!r.ok) return;
    const record: FinancierReadRecord = {
      financier: r.value.financier,
      legacyId: null,
      createdAt: NOW,
      updatedAt: NOW,
    };
    const { app, teardown } = await makeApp([record]);
    const token = await login(app, READER_EMAIL);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/financiers/${String(id)}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(detail.statusCode, 200);
    const dto = detail.json() as { bankAccount: unknown; pixKey: unknown };
    assert.equal(dto.bankAccount, null);
    assert.equal(dto.pixKey, null);
    await teardown();
  });
});

describe('FINANCIERS-HTTP-BANK-PIX — PUT altera banco/PIX', () => {
  it('CA4 — PUT alterando banco/PIX → 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const created = await post(app, token, { ...VALID_BODY, bankAccount: BANK, pixKey: null });
    const id = (created.headers['location'] ?? '').slice('/api/v1/financiers/'.length);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/financiers/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, bankAccount: null, pixKey: PIX },
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });

  it('CA4 — PUT pode zerar banco/PIX para null → 200', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const created = await post(app, token, { ...VALID_BODY, bankAccount: BANK, pixKey: PIX });
    const id = (created.headers['location'] ?? '').slice('/api/v1/financiers/'.length);
    const res = await app.inject({
      method: 'PUT',
      url: `/api/v1/financiers/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { ...VALID_BODY, bankAccount: null, pixKey: null },
    });
    assert.equal(res.statusCode, 200);
    await teardown();
  });
});
