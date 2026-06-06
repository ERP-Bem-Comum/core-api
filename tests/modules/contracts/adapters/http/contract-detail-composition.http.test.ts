/**
 * CONTRACTS-DETAIL-COMPOSITION-HTTP — W0 (RED) — GET /api/v2/contracts/:id compõe contratado.
 *
 * Rota gorda transitória (ADR-0032): o detalhe inclui o bloco `contractor`
 * `{ type, id, snapshot|null }` composto via `ContractorReadPort` injetado, e declara
 * `Deprecation`/`Sunset`. Driver memory + port fake (sem MySQL/partners real).
 *
 * RED até o W1: `buildContractsHttpDeps` não aceita `contractorReadPort` e a rota
 * não compõe o bloco nem seta os headers.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { ok } from '#src/shared/primitives/result.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';
import type { ContractorReadPort } from '#src/modules/partners/public-api/index.ts';
import { buildContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'reader@example.com';
const CONTRACT_ID = '11111111-1111-4111-8111-111111111111';
const CONTRACTOR_ID = '55555555-5555-4555-8555-555555555555'; // = someContractor() do fixture
const UPDATED = new Date('2026-05-30T09:30:00.000Z');

const supplierPort = (): ContractorReadPort => ({
  getSupplierView: (id) =>
    Promise.resolve(
      ok(
        id === CONTRACTOR_ID
          ? {
              type: 'supplier',
              id,
              name: 'Fornecedor X',
              email: 'x@y.com',
              document: '11222333000181',
              serviceCategory: 'INFORMATICA',
              bankAccount: {
                bank: '001',
                agency: '0001-2',
                accountNumber: '123456',
                checkDigit: '7',
              },
              pixKey: { keyType: 'email', key: 'pix@x.com' },
              updatedAt: UPDATED,
            }
          : null,
      ),
    ),
  getFinancierView: () => Promise.resolve(ok(null)),
  getCollaboratorView: () => Promise.resolve(ok(null)),
  getActView: () => Promise.resolve(ok(null)),
});

const emptyPort = (): ContractorReadPort => ({
  getSupplierView: () => Promise.resolve(ok(null)),
  getFinancierView: () => Promise.resolve(ok(null)),
  getCollaboratorView: () => Promise.resolve(ok(null)),
  getActView: () => Promise.resolve(ok(null)),
});

const makeApp = async (port: ContractorReadPort) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: [buildContract({ id: CONTRACT_ID })] },
    contractorReadPort: port,
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: READER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('CONTRACTS-DETAIL-COMPOSITION-HTTP — GET /contracts/:id', () => {
  it('compõe contractor.snapshot (supplier, com bancário/PIX) + headers Sunset', async () => {
    const { app, teardown } = await makeApp(supplierPort());
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/contracts/${CONTRACT_ID}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as {
        contractor: {
          type: string;
          id: string;
          snapshot: {
            name: string;
            document: string;
            bankAccount: unknown;
            updatedAt: string;
          } | null;
        };
      };
      assert.equal(body.contractor.type, 'supplier');
      assert.equal(body.contractor.id, CONTRACTOR_ID);
      assert.equal(body.contractor.snapshot?.name, 'Fornecedor X');
      assert.equal(body.contractor.snapshot?.document, '11222333000181');
      assert.deepEqual(body.contractor.snapshot?.bankAccount, {
        bank: '001',
        agency: '0001-2',
        accountNumber: '123456',
        checkDigit: '7',
      });
      // ADR-0032: rota transitória declara Deprecation/Sunset.
      assert.equal(res.headers['deprecation'], 'true');
      assert.ok(res.headers['sunset'], 'header Sunset ausente');
    } finally {
      await teardown();
    }
  });

  it('contratado ausente em Parceiros → contractor.snapshot null (200, nunca 500)', async () => {
    const { app, teardown } = await makeApp(emptyPort());
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/contracts/${CONTRACT_ID}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { contractor: { type: string; id: string; snapshot: unknown } };
      assert.equal(body.contractor.type, 'supplier');
      assert.equal(body.contractor.id, CONTRACTOR_ID);
      assert.equal(body.contractor.snapshot, null);
    } finally {
      await teardown();
    }
  });
});
