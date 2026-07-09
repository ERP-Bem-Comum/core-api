/**
 * FIN-LISTAGEM-TIMELINE — W0 RED da borda GET /api/v2/financial/documents (listagem real).
 *
 * Hoje o handler é STUB (devolve sempre { items: [], total: 0 }). Estes cenários criam documentos
 * e esperam o conjunto/total reais filtrados → FALHAM contra o stub (RED). Auth via hooks FAKE
 * (mesmo padrão de financial-documents.http.test.ts — sem rate-limit).
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
  documentNumber: 'NFS-001',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...overrides,
});

// UUID v4 válido e determinístico a partir de um seed hex curto (evita colisão de supplierRef entre casos).
const newUuidLike = (seed: string): string => {
  const h = (seed + '0'.repeat(8)).slice(0, 8);
  return `${h}-0000-4000-8000-000000000000`;
};

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
const list = (query: string, perms = WRITER) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents${query}`,
    headers: { authorization: `Bearer ${perms}` },
  });

describe('FIN-LISTAGEM-TIMELINE — GET /api/v2/financial/documents (listagem real)', () => {
  it('CT-001: lista documentos Open criados (não vazio)', async () => {
    const created = await post(nfseBody());
    assert.equal(created.statusCode, 201, created.body);

    const res = await list('?status=Open&page=1&pageSize=20');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: unknown[]; total: number };
    assert.ok(body.total >= 1, 'total deve refletir o documento criado');
    assert.ok(body.items.length >= 1, 'items não pode ser vazio');
  });

  it('CT-003: filtra por supplierRef', async () => {
    await post(nfseBody({ supplierRef: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }));
    const res = await list('?supplierRef=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: { supplierRef: string }[]; total: number };
    assert.ok(body.total >= 1);
    assert.ok(body.items.every((i) => i.supplierRef === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
  });

  it('CT-007: supplierRef malformado → 400', async () => {
    const res = await list('?supplierRef=not-a-uuid');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CT-008: sem fiscal-document:read → 403', async () => {
    const res = await list('?status=Open', PLAIN);
    assert.equal(res.statusCode, 403);
  });

  it('CT-009: type inválido (fora do enum) → 400', async () => {
    const res = await list('?type=FOO');
    assert.equal(res.statusCode, 400, res.body);
  });

  // ── #47/US1: enriquecimento do item (campos locais) ────────────────────────
  it('CT-DTO-01: item traz series, grossValueCents, paymentMethod, contractRef', async () => {
    const SUP = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    const CONTRACT = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
    const created = await post(
      nfseBody({
        supplierRef: SUP,
        series: 'A1',
        contractRef: CONTRACT,
        grossValueCents: '150000',
        paymentMethod: 'TED',
      }),
    );
    assert.equal(created.statusCode, 201, created.body);

    const res = await list(`?supplierRef=${SUP}`);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      items: {
        series: string | null;
        grossValueCents: string | null;
        paymentMethod: string | null;
        contractRef: string | null;
      }[];
    };
    const item = body.items[0];
    assert.ok(item, 'deve haver item');
    assert.equal(item.series, 'A1');
    assert.equal(item.grossValueCents, '150000');
    assert.equal(item.paymentMethod, 'TED');
    assert.equal(item.contractRef, CONTRACT);
  });

  it('CT-DTO-02: documento sem série/contrato → series/contractRef null', async () => {
    const SUP = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
    await post(nfseBody({ supplierRef: SUP }));
    const res = await list(`?supplierRef=${SUP}`);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      items: { series: string | null; contractRef: string | null }[];
    };
    const item = body.items[0];
    assert.ok(item, 'deve haver item');
    assert.equal(item.series, null);
    assert.equal(item.contractRef, null);
  });

  // ── #167/FIN-DOC-SEARCH: busca textual `q` (driver memory → só documentNumber) ────
  it('CA1 (#167): q filtra por documentNumber (contains, case-insensitive)', async () => {
    await post(nfseBody({ documentNumber: 'QSEARCH-ALPHA-001', supplierRef: newUuidLike('a1') }));
    await post(nfseBody({ documentNumber: 'QSEARCH-BETA-002', supplierRef: newUuidLike('b2') }));

    const res = await list('?q=alpha&pageSize=100');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: { documentNumber: string | null }[]; total: number };
    assert.ok(body.total >= 1, 'deve achar o ALPHA');
    assert.ok(
      body.items.every((i) => (i.documentNumber ?? '').toUpperCase().includes('ALPHA')),
      'todos os itens devem conter ALPHA no documentNumber',
    );
    assert.ok(
      !body.items.some((i) => (i.documentNumber ?? '').includes('BETA')),
      'BETA não pode aparecer',
    );
  });

  it('CA2 (#167): q combina com status (AND); q ausente = inalterado', async () => {
    const num = 'QCOMBO-777';
    await post(nfseBody({ documentNumber: num, supplierRef: newUuidLike('c7') }));

    const open = await list(`?q=QCOMBO&status=Open&pageSize=100`);
    assert.equal(open.statusCode, 200, open.body);
    assert.ok((open.json() as { total: number }).total >= 1, 'q+status=Open deve achar');

    const paid = await list(`?q=QCOMBO&status=Paid&pageSize=100`);
    assert.equal(paid.statusCode, 200, paid.body);
    assert.equal(
      (paid.json() as { total: number }).total,
      0,
      'q+status=Paid não deve achar (é Open)',
    );
  });

  it('CA3 (#167): q trimado; vazio/só-espaços → 400; wildcards são literais (escapados)', async () => {
    await post(nfseBody({ documentNumber: 'QTRIM-500', supplierRef: newUuidLike('d5') }));

    // trim nas bordas
    const trimmed = await list(`?q=${encodeURIComponent('  QTRIM  ')}&pageSize=100`);
    assert.equal(trimmed.statusCode, 200, trimmed.body);
    assert.ok(
      (trimmed.json() as { total: number }).total >= 1,
      'termo com espaços deve ser trimado',
    );

    // vazio e só-espaços → 400 (min 1 após trim)
    assert.equal((await list('?q=')).statusCode, 400);
    assert.equal((await list(`?q=${encodeURIComponent('   ')}`)).statusCode, 400);

    // wildcard `%` é literal (escapado): nenhum documentNumber contém '%' → total 0
    const pct = await list(`?q=${encodeURIComponent('%')}&pageSize=100`);
    assert.equal(pct.statusCode, 200, pct.body);
    assert.equal((pct.json() as { total: number }).total, 0, '% deve ser literal, não coringa');
  });
});
