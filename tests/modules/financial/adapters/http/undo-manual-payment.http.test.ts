/**
 * #61 — borda HTTP do desfazer baixa (POST /documents/:id/payables/:payableId/undo-manual-payment)
 * e da trava do "Voltar para edição" (POST /documents/:id/undo-approval). Driver memory; auth FAKE.
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

const TOKEN = 'fiscal-document:write,fiscal-document:read,payable:approve';
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

let app: Awaited<ReturnType<typeof buildApp>>;
let teardown: () => Promise<void>;

before(async () => {
  const deps = await buildFinancialHttpDeps({ driver: 'memory' });
  app = await buildApp({
    config: readHttpConfig({ RATE_LIMIT_MAX: '10000' }),
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });
  teardown = async () => {
    await app.close();
    await deps.shutdown();
  };
});

after(async () => {
  await teardown();
});

interface PayableDto {
  id: string;
  kind: string;
  status: string;
}

const post = (url: string, payload: Record<string, unknown>, token = TOKEN) =>
  app.inject({ method: 'POST', url, headers: { authorization: `Bearer ${token}` }, payload });

let seq = 0;
const paidDocument = async (): Promise<{ id: string; parentId: string; version: number }> => {
  seq += 1;
  const created = await post('/api/v2/financial/documents', {
    type: 'NFS-e',
    documentNumber: `NFS-UNDO-${seq}`,
    supplierRef: SUP,
    paymentMethod: 'PIX',
    grossValueCents: '1000000',
    sourceDiscountsCents: '0',
    discountsCents: '0',
    penaltyCents: '0',
    interestCents: '0',
    retentions: [{ type: 'ISS', baseCents: '350000', rateBps: 1000, valueCents: '35000' }],
    registeredTaxes: [],
    dueDate: '2026-12-31',
    asDraft: false,
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = (created.json() as { id: string }).id;

  const approved = await post(`/api/v2/financial/documents/${id}/approve`, { version: 0 });
  assert.equal(approved.statusCode, 200, approved.body);
  const body = approved.json() as { version: number; payables: readonly PayableDto[] };
  const parent = body.payables.find((p) => p.kind === 'Parent');
  assert.ok(parent !== undefined, 'esperava o título pai');

  const paid = await post(
    `/api/v2/financial/documents/${id}/payables/${parent.id}/manual-payment`,
    {
      version: body.version,
      paidAt: '2026-06-10',
    },
  );
  assert.equal(paid.statusCode, 200, paid.body);
  return { id, parentId: parent.id, version: body.version };
};

const undoUrl = (id: string, payableId: string): string =>
  `/api/v2/financial/documents/${id}/payables/${payableId}/undo-manual-payment`;

describe('#61 — POST undo-manual-payment', () => {
  it('Pago → volta a Aprovado; data some da lista; trilha traz motivo e autor', async () => {
    const { id, parentId, version } = await paidDocument();

    const res = await post(undoUrl(id, parentId), { version, reason: 'Data da baixa errada' });
    assert.equal(res.statusCode, 200, res.body);
    const parent = (res.json() as { payables: readonly PayableDto[] }).payables.find(
      (p) => p.kind === 'Parent',
    );
    assert.equal(parent?.status, 'Approved');

    const list = await app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    const item = (list.json() as { items: readonly Record<string, unknown>[] }).items.find(
      (i) => i['payableId'] === parentId,
    );
    assert.equal(item?.['paidAt'], null);

    const timeline = await app.inject({
      method: 'GET',
      url: `/api/v2/financial/documents/${id}/timeline`,
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(timeline.statusCode, 200, timeline.body);
    const entries = (
      timeline.json() as {
        entries: readonly { eventType: string; reason: string | null; actor: string | null }[];
      }
    ).entries.filter((e) => e.eventType === 'ManualPaymentUndone');
    assert.ok(entries.length > 0, 'esperava o marco na trilha');
    assert.ok(
      entries.every((e) => e.reason === 'Data da baixa errada' && e.actor === TEST_USER_ID),
    );
  });

  it('desfazer de novo (já não está Pago) → 409', async () => {
    const { id, parentId, version } = await paidDocument();
    assert.equal((await post(undoUrl(id, parentId), { version, reason: 'x' })).statusCode, 200);
    const again = await post(undoUrl(id, parentId), { version, reason: 'x' });
    assert.equal(again.statusCode, 409, again.body);
  });

  it('sem motivo → 400 na borda; motivo só com espaços → 400', async () => {
    const { id, parentId, version } = await paidDocument();
    assert.equal((await post(undoUrl(id, parentId), { version })).statusCode, 400);
    assert.equal((await post(undoUrl(id, parentId), { version, reason: '   ' })).statusCode, 400);
  });

  it('exige payable:approve → 403', async () => {
    const { id, parentId, version } = await paidDocument();
    const res = await post(
      undoUrl(id, parentId),
      { version, reason: 'x' },
      'fiscal-document:write',
    );
    assert.equal(res.statusCode, 403, res.body);
  });
});

describe('#61 — "Voltar para edição" com título além de Aprovado', () => {
  it('título Pago → 409; desfeita a baixa → volta para edição normalmente', async () => {
    const { id, parentId, version } = await paidDocument();

    const blocked = await post(`/api/v2/financial/documents/${id}/undo-approval`, { version });
    assert.equal(blocked.statusCode, 409, blocked.body);
    assert.match(
      (blocked.json() as { error: { message: string } }).error.message,
      /desfaça antes a conciliação e a baixa/,
    );

    assert.equal((await post(undoUrl(id, parentId), { version, reason: 'x' })).statusCode, 200);
    const reopened = await post(`/api/v2/financial/documents/${id}/undo-approval`, { version });
    assert.equal(reopened.statusCode, 200, reopened.body);
  });
});
