/**
 * #255 (FIN-DETAIL-PAYEE-BANK) — dados bancários do favorecido no GET /documents/:id.
 *
 * Composição síncrona na borda (ADR-0032) lendo `partners/public-api` (ContractorReadPort).
 * Bancário/PIX existem só em Supplier → `payeeBank` resolve para payeeKind='supplier';
 * não-supplier / not-found / port ausente → `payeeBank: null` (degradação graciosa).
 * Driver memory; ContractorReadPort FAKE injetado; auth FAKE.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import type {
  ContractorReadPort,
  SupplierView,
  FinancierView,
} from '#src/modules/partners/public-api/index.ts';
import { ok } from '#src/shared/primitives/result.ts';

const TOKEN = 'fiscal-document:write,fiscal-document:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = TEST_USER_ID;
  return undefined;
};
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').replace('Bearer ', '').split(',');
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissão' } });
    }
    return undefined;
  };

const nfseBody = (over: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-255',
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '1000000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...over,
});

const supplierView = (over: Partial<SupplierView>): SupplierView => ({
  type: 'supplier',
  id: SUP,
  name: 'ACME Serviços',
  email: 'acme@example.com',
  document: '12345678000190',
  serviceCategory: 'CONSULTORIA',
  bankAccount: null,
  pixKey: null,
  updatedAt: new Date('2026-06-01T00:00:00.000Z'),
  ...over,
});

const portReturning = (
  sup: SupplierView | null,
  fin: FinancierView | null = null,
): ContractorReadPort => ({
  getSupplierView: () => Promise.resolve(ok(sup)),
  getFinancierView: () => Promise.resolve(ok(fin)),
  getCollaboratorView: () => Promise.resolve(ok(null)),
  getActView: () => Promise.resolve(ok(null)),
});

const buildWithPort = async (port: ContractorReadPort) => {
  const financialDeps = await buildFinancialHttpDeps({
    driver: 'memory',
    contractorReadPort: port,
  });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(financialDeps, { requireAuth, authorize })],
  });
  return {
    app,
    teardown: async () => {
      await app.close();
      await financialDeps.shutdown();
    },
  };
};

const createAndGet = async (
  h: Awaited<ReturnType<typeof buildWithPort>>,
  bodyOver: Record<string, unknown>,
) => {
  const created = await h.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${TOKEN}` },
    payload: nfseBody(bodyOver),
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = (created.json() as { id: string }).id;
  const detail = await h.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  assert.equal(detail.statusCode, 200, detail.body);
  return detail.json() as {
    payeeBank: {
      bankAccount: {
        bank: string;
        agency: string;
        accountNumber: string;
        checkDigit: string;
      } | null;
      pixKey: { keyType: string; key: string } | null;
    } | null;
  };
};

describe('financial/http — dados bancários do favorecido no GET /:id (#255)', () => {
  it('CA1: favorecido supplier com PIX → payeeBank.pixKey, bankAccount null', async () => {
    const h = await buildWithPort(
      portReturning(supplierView({ pixKey: { keyType: 'cnpj', key: '12345678000190' } })),
    );
    try {
      const body = await createAndGet(h, { payeeKind: 'supplier' });
      assert.ok(body.payeeBank, 'payeeBank presente');
      assert.equal(body.payeeBank.pixKey?.key, '12345678000190');
      assert.equal(body.payeeBank.pixKey?.keyType, 'cnpj');
      assert.equal(body.payeeBank.bankAccount, null);
    } finally {
      await h.teardown();
    }
  });

  it('CA2: favorecido supplier com conta bancária → payeeBank.bankAccount, pixKey null', async () => {
    const h = await buildWithPort(
      portReturning(
        supplierView({
          bankAccount: { bank: '237', agency: '0001', accountNumber: '12345', checkDigit: '6' },
        }),
      ),
    );
    try {
      const body = await createAndGet(h, { payeeKind: 'supplier' });
      assert.ok(body.payeeBank, 'payeeBank presente');
      assert.equal(body.payeeBank.bankAccount?.bank, '237');
      assert.equal(body.payeeBank.bankAccount?.accountNumber, '12345');
      assert.equal(body.payeeBank.pixKey, null);
    } finally {
      await h.teardown();
    }
  });

  it('CA3: favorecido supplier não encontrado (port → null) → payeeBank null', async () => {
    const h = await buildWithPort(portReturning(null));
    try {
      const body = await createAndGet(h, { payeeKind: 'supplier' });
      assert.equal(body.payeeBank, null);
    } finally {
      await h.teardown();
    }
  });

  // #708/CA5 — decisão (b) da P.O.: os QUATRO `payeeKind` entram na VAN. Este caso afirmava o
  // contrário até 08/2026 ("não-supplier → payeeBank null"), fixando uma degradação que nunca foi
  // decisão: era a premissa "bancário/PIX só existem em Supplier" sobrevivendo à mudança do
  // domínio. Um financiador com conta cadastrada aparecia sem dados bancários na tela, e não
  // havia como distinguir cadastro ausente de leitura ausente.
  it('CA4: favorecido financier COM conta → payeeBank preenchido', async () => {
    const h = await buildWithPort(
      portReturning(null, {
        type: 'financier',
        id: SUP,
        name: 'Banco X',
        document: '99999999000199',
        corporateName: 'Banco X S.A.',
        legalRepresentative: 'Fulano',
        telephone: '11999999999',
        address: 'Rua Y, 100',
        bankAccount: { bank: '341', agency: '1234-5', accountNumber: '99887', checkDigit: '6' },
        pixKey: null,
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
    try {
      const body = await createAndGet(h, { payeeKind: 'financier' });
      assert.deepEqual(body.payeeBank, {
        bankAccount: { bank: '341', agency: '1234-5', accountNumber: '99887', checkDigit: '6' },
        pixKey: null,
      });
    } finally {
      await h.teardown();
    }
  });

  // Favorecido sem destino cadastrado continua devolvendo o bloco com os dois campos nulos — o
  // que distingue "não tem cadastro" de "não sei ler", que era exatamente o que se perdia antes.
  it('CA5: favorecido financier SEM destino → bloco presente, campos nulos', async () => {
    const h = await buildWithPort(
      portReturning(null, {
        type: 'financier',
        id: SUP,
        name: 'Banco X',
        document: '99999999000199',
        corporateName: 'Banco X S.A.',
        legalRepresentative: 'Fulano',
        telephone: '11999999999',
        address: 'Rua Y, 100',
        bankAccount: null,
        pixKey: null,
        updatedAt: new Date('2026-06-01T00:00:00.000Z'),
      }),
    );
    try {
      const body = await createAndGet(h, { payeeKind: 'financier' });
      assert.deepEqual(body.payeeBank, { bankAccount: null, pixKey: null });
    } finally {
      await h.teardown();
    }
  });
});
