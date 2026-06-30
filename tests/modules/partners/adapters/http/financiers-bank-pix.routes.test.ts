/**
 * PAR-PARTNER-BANK-PIX (US1). Banco/PIX (opcionais) no Financiador.
 *
 * Em driver memory o reader e o writer são stores distintos (read-after-write não reflete);
 * por isso o POST testa a escrita (201/422) e o detalhe é verificado por um seed no reader.
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

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'fin.bank@example.com';
const NOW = new Date('2026-01-10T08:00:00.000Z');

const BANK = { bank: 'Banco X', agency: '0001', accountNumber: '12345', checkDigit: '6' };
const PIX = { keyType: 'email', key: 'fin@bemcomum.org' } as const;

const BODY = {
  name: 'Banco Apoio',
  corporateName: 'Banco Apoio S.A.',
  legalRepresentative: 'Maria Diretora',
  cnpj: '11222333000181',
  telephone: '+5511999998888',
  address: 'Av. Central, 1000',
  bankAccount: BANK,
  pixKey: PIX,
};

const seedWithBankPix = (): { id: string; record: FinancierReadRecord } => {
  const id = FinancierId.generate();
  const r = Financier.register({
    id,
    name: 'Banco Apoio',
    corporateName: 'Banco Apoio S.A.',
    legalRepresentative: 'Maria Diretora',
    cnpj: '11222333000181',
    telephone: '+5511999998888',
    address: 'Av. Central, 1000',
    bankAccount: BANK,
    pixKey: PIX,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture register: ${r.ok ? '' : r.error}`);
  return {
    id: String(id),
    record: { financier: r.value.financier, legacyId: 9, createdAt: NOW, updatedAt: NOW },
  };
};

const makeApp = async (financiers: readonly FinancierReadRecord[] = []) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [FINANCIER_PERMISSION.write, FINANCIER_PERMISSION.read],
        },
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('FINANCIERS — banco/PIX (US1)', () => {
  it('CA1: POST /financiers com bankAccount+pixKey válidos → 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const created = await app.inject({
      method: 'POST',
      url: '/api/v1/financiers',
      headers: { authorization: `Bearer ${token}` },
      payload: BODY,
    });
    assert.equal(created.statusCode, 201);
    await teardown();
  });

  it('CA1: GET /financiers/:id retorna bankAccount e pixKey persistidos (via seed)', async () => {
    const { id, record } = seedWithBankPix();
    const { app, teardown } = await makeApp([record]);
    const token = await login(app);
    const detail = await app.inject({
      method: 'GET',
      url: `/api/v1/financiers/${id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(detail.statusCode, 200);
    const body = detail.json() as { bankAccount: unknown; pixKey: unknown };
    assert.deepEqual(body.bankAccount, BANK);
    assert.deepEqual(body.pixKey, PIX);
    await teardown();
  });

  it('CA3: agency fora do formato (4 díg + DV) → 422', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/financiers',
      headers: { authorization: `Bearer ${token}` },
      payload: { ...BODY, bankAccount: { ...BANK, agency: '12' } },
    });
    assert.equal(res.statusCode, 422);
    await teardown();
  });

  it('CA6: banco/PIX são opcionais — POST sem eles → 201', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const { bankAccount: _b, pixKey: _p, ...noBank } = BODY;
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/financiers',
      headers: { authorization: `Bearer ${token}` },
      payload: noBank,
    });
    assert.equal(res.statusCode, 201);
    await teardown();
  });
});
