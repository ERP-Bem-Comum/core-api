/**
 * W1 (FIN-DOCUMENT-TYPE-METADATA · #292) — borda HTTP: GET /api/v2/financial/document-types/metadata.
 * Smoke: rota existe + RBAC (reference:read). Catálogo é domínio PURO (sem deps/port) — espelha o
 * molde read-only de GET /financial/categories (categories.http.test.ts).
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

const READER = 'reference:read';
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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

type DocumentTypeMetadataDto = Readonly<{
  type: string;
  allowedRetentions: readonly string[];
  accessKeyRequired: boolean;
  suggestedPaymentMethod: string | null;
}>;

describe('financial/http — GET /document-types/metadata (#292)', () => {
  it('reference:read → 200 com os 7 tipos e os metadados fixos do catálogo', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/document-types/metadata',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as readonly DocumentTypeMetadataDto[];
    assert.equal(body.length, 7, 'catálogo deve cobrir os 7 tipos de documento');

    const byType = new Map(body.map((m) => [m.type, m]));
    const nfse = byType.get('NFS-e');
    assert.ok(nfse, 'NFS-e deve estar no catálogo');
    assert.deepEqual([...nfse.allowedRetentions].sort(), ['CSRF', 'INSS', 'IRRF', 'ISS']);

    const danfe = byType.get('DANFE');
    assert.ok(danfe, 'DANFE deve estar no catálogo');
    assert.equal(danfe.accessKeyRequired, true);

    const boleto = byType.get('Boleto');
    assert.ok(boleto, 'Boleto deve estar no catálogo');
    assert.equal(boleto.suggestedPaymentMethod, 'Boleto');
  });

  it('sem reference:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/document-types/metadata',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
