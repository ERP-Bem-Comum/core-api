/**
 * #165 — borda HTTP: editar dueDate/description de documento APROVADO (ajuste leve, sem regenerar filhos).
 * Antes: PATCH só aceitava Open → 409 em Approved. Agora: dueDate/description aceitos em Approved;
 * mudança de valor (grossValue/retenções) em Approved continua 409.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';

const WRITER = 'fiscal-document:write,fiscal-document:read,fiscal-document:cancel';
const APPROVER = `${WRITER},payable:approve`;
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

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

const nfseBody = () => ({
  type: 'NFS-e',
  documentNumber: 'NFS-EDIT-1',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [{ type: 'ISS', baseCents: '100000', rateBps: 300, valueCents: '3000' }],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const financialDeps = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(financialDeps, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await financialDeps.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

interface Doc {
  id: string;
  status: string;
  version: number;
  dueDate: string | null;
}

const createApproved = async (): Promise<Doc> => {
  const created = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: nfseBody(),
  });
  assert.equal(created.statusCode, 201, created.body);
  const c = created.json() as Doc;
  const appr = await handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${c.id}/approve`,
    headers: { authorization: `Bearer ${APPROVER}` },
    payload: { version: c.version },
  });
  assert.equal(appr.statusCode, 200, appr.body);
  const a = appr.json() as Doc;
  assert.equal(a.status, 'Approved');
  return a;
};

describe('financial/http — editar Aprovado (#165)', () => {
  it('#165: PATCH dueDate em Approved → 200 e permanece Approved', async () => {
    const a = await createApproved();
    const res = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${a.id}`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { version: a.version, dueDate: '2027-03-20' },
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal((res.json() as Doc).status, 'Approved');
  });

  it('#165: mudança de VALOR (grossValue) em Approved continua bloqueada → 409', async () => {
    const a = await createApproved();
    const res = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${a.id}`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { version: a.version, grossValueCents: '200000' },
    });
    assert.equal(res.statusCode, 409, res.body);
  });
});
