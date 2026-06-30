/**
 * FIN-LISTAGEM-TIMELINE — W0 RED da borda GET /api/v2/financial/documents/:id/timeline (US2).
 *
 * Contrato observável: após criar→ajustar→aprovar, a trilha por-campo (Time Travel) deve refletir
 * cada marco com `changes` (antes→novo) em ordem cronológica. RED enquanto a rota não existe.
 * Auth via hooks FAKE (mesmo padrão das demais suites HTTP).
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
const PLAIN = 'none';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = '99999999-9999-4999-8999-999999999999';
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

const nfseBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: 'NFS-e',
  documentNumber: 'NFS-TL',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...overrides,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const deps = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await deps.shutdown();
    },
  };
});
after(async () => {
  await handle.teardown();
});

const post = (body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: body,
  });
const timeline = (id: string, perms = WRITER) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}/timeline`,
    headers: { authorization: `Bearer ${perms}` },
  });

interface TimelineBody {
  entries: {
    eventType: string;
    target: { kind: string; id: string };
    occurredAt: string;
    actor: string | null;
    changes: { field: string; before: string | null; after: string | null }[];
  }[];
}

describe('FIN-LISTAGEM-TIMELINE — GET /documents/:id/timeline (Time Travel)', () => {
  it('CT-014: trilha reflete criação→ajuste→aprovação com changes, em ordem cronológica', async () => {
    const created = await post(nfseBody());
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const patch = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${id}`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { version: 0, grossValueCents: '200000' },
    });
    assert.equal(patch.statusCode, 200, patch.body);

    const approve = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${id}/approve`,
      headers: { authorization: `Bearer ${APPROVER}` },
      payload: { version: 1 },
    });
    assert.equal(approve.statusCode, 200, approve.body);

    const res = await timeline(id);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as TimelineBody;
    assert.ok(body.entries.length >= 3, 'criação + ajuste + aprovação geram ao menos 3 marcos');

    // ordem cronológica não-decrescente
    const times = body.entries.map((e) => new Date(e.occurredAt).getTime());
    for (let i = 1; i < times.length; i++) {
      assert.ok(times[i]! >= times[i - 1]!, 'entradas em ordem cronológica');
    }

    // o ajuste registrou a mudança de grossValue
    const hasGrossChange = body.entries.some((e) =>
      e.changes.some(
        (c) => c.field === 'grossValue' && c.before === '100000' && c.after === '200000',
      ),
    );
    assert.ok(hasGrossChange, 'ajuste registra grossValue 100000 → 200000');

    // a aprovação registrou a transição de status
    const hasStatusChange = body.entries.some((e) =>
      e.changes.some((c) => c.field === 'status' && c.after === 'Approved'),
    );
    assert.ok(hasStatusChange, 'aprovação registra transição de status para Approved');
  });

  it('CT-015: timeline de documento inexistente → 404', async () => {
    const res = await timeline('ffffffff-ffff-4fff-8fff-ffffffffffff');
    assert.equal(res.statusCode, 404);
  });

  it('CT-016: sem fiscal-document:read → 403', async () => {
    const created = await post(nfseBody());
    const id = (created.json() as { id: string }).id;
    const res = await timeline(id, PLAIN);
    assert.equal(res.statusCode, 403);
  });
});
