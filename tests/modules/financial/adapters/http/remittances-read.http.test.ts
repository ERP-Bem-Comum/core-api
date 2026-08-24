/**
 * REMITTANCES-READ (#728) — borda HTTP: GET /api/v2/financial/remittances (lista paginada) e
 * GET /api/v2/financial/remittances/:id (detalhe).
 *
 * Read-only: a tela de acompanhamento lê o registro que o generate/worker já mantém. Não consome
 * NSA nem toca no bucket — por isso a permissão é `remittance:read`.
 *
 * Driver memory (sem Docker); auth via hooks FAKE (o "token" Bearer carrega as permissões por
 * vírgula). O repo de remessa é semeado via seam de composição e injetado por `config.remittanceRepo`.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { isOk } from '#src/shared/index.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import { createInMemoryRemittanceRepository } from '#src/modules/financial/adapters/persistence/repos/remittance-repository.in-memory.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create, confirmTransmitted } from '#src/modules/financial/domain/remittance/remittance.ts';

const READER = 'remittance:read';
const PLAIN = 'none'; // token válido, sem a permissão de remessa → 403 (não 401)
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const LIST_URL = '/api/v2/financial/remittances';

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

const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

// Três remessas com `generatedAt` distintos e ids fixos, semeadas na ordem de geração (crescente).
// A leitura tem de devolvê-las na ordem INVERSA (mais recente primeiro).
const REM_OLDEST = '11111111-1111-4111-8111-111111111111';
const REM_MIDDLE = '22222222-2222-4222-8222-222222222222';
const REM_NEWEST = '33333333-3333-4333-8333-333333333333';
const REM_ABSENT = '44444444-4444-4444-8444-444444444444';

const ACCOUNT = CedenteAccountId.generate();

const build = (id: string, nsa: number, generatedAt: string, documentIds: readonly string[]) => {
  const idR = RemittanceId.rehydrate(id);
  if (!idR.ok) throw new Error(`test setup: id inválido (${id})`);
  const r = create({
    id: idR.value,
    cedenteAccountId: ACCOUNT,
    nsa,
    fileName: `PAG_1.11082026140000_${String(nsa).padStart(6, '0')}.REM`,
    contentHash: 'a'.repeat(64),
    // #752: NSA + posição. O NSA distingue as remessas do fixture entre si.
    payables: documentIds.map((payableId, i) => ({
      payableId,
      documentId: payableId,
      yourNumber: `${String(nsa).padStart(6, '0')}${String(i + 1).padStart(6, '0')}`,
    })),
    generatedAt,
  });
  if (!r.ok) throw new Error(`test setup: remittance (${r.error})`);
  return r.value;
};

// ⚠️ Um título por remessa, sem compartilhamento — e isso é invariante, não arrumação.
//
// Até a #789 esta fixture semeava DOC_A em duas remessas vivas e DOC_B em outras duas, montando o
// estado que a trava anti-dupla-emissão existe justamente para impedir: o mesmo título a caminho do
// banco duas vezes. Passava porque o `save` aceitava tudo; com a reserva no `save`, o próprio setup
// passou a ser recusado — que é o sinal correto.
//
// Nenhum destes casos precisava do compartilhamento: eles medem ordenação, paginação, contagem e
// detalhe. O que a fixture precisa entregar é uma remessa com DOIS títulos (para `payableCount`), e
// isso se faz com dois títulos PRÓPRIOS.
const DOC_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const DOC_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const DOC_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const DOC_D = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

type ListItem = Readonly<{
  remittanceId: string;
  cedenteAccountId: string;
  nsa: number;
  fileName: string;
  status: string;
  generatedAt: string;
  settledAt: string | null;
  detail: string | null;
  payableCount: number;
}>;

type ListBody = Readonly<{
  remittances: readonly ListItem[];
  total: number;
  page: number;
  limit: number;
}>;

type DetailBody = ListItem &
  Readonly<{ payableIds: readonly string[]; documentIds: readonly string[] }>;

before(async () => {
  // As remessas da fixture são criadas pelo `save`, que desde o ADR-0065 §2 transiciona os títulos
  // por CAS — título não declarado seria recusado, e não haveria remessa nenhuma a listar. Este
  // arquivo mede a LEITURA (lista e detalhe); o estado dos títulos é pressuposto, não objeto.
  const repo = createInMemoryRemittanceRepository({
    payableStatuses: Object.fromEntries(
      [DOC_A, DOC_B, DOC_C, DOC_D].map((id) => [id, 'Approved' as const]),
    ),
  });

  await repo.save(build(REM_OLDEST, 1, '2026-08-11T14:00:00.000Z', [DOC_A]));
  await repo.save(build(REM_MIDDLE, 2, '2026-08-12T14:00:00.000Z', [DOC_B, DOC_C]));

  // A mais recente é transmitida → carrega settledAt/detail (não-null no contrato).
  const newest = build(REM_NEWEST, 3, '2026-08-13T14:00:00.000Z', [DOC_D]);
  const transmitted = confirmTransmitted(newest, '2026-08-13T15:00:00.000Z', 'consta em BACKUP');
  assert.ok(isOk(transmitted));
  await repo.save(transmitted.value.remittance, transmitted.value.events);

  const deps = await buildFinancialHttpDeps({ driver: 'memory', remittanceRepo: repo });
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

const list = async (query = '', perms = READER) =>
  handle.app.inject({ method: 'GET', url: `${LIST_URL}${query}`, headers: bearer(perms) });

const detail = async (id: string, perms = READER) =>
  handle.app.inject({ method: 'GET', url: `${LIST_URL}/${id}`, headers: bearer(perms) });

describe('financial/http — GET /remittances (#728) · RBAC', () => {
  it('sem Authorization → 401', async () => {
    const res = await handle.app.inject({ method: 'GET', url: LIST_URL });
    assert.equal(res.statusCode, 401, res.body);
  });

  it('token sem remittance:read → 403', async () => {
    const res = await list('', PLAIN);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('detalhe sem remittance:read → 403', async () => {
    const res = await detail(REM_NEWEST, PLAIN);
    assert.equal(res.statusCode, 403, res.body);
  });
});

describe('financial/http — GET /remittances (#728) · lista', () => {
  it('devolve as remessas mais recentes primeiro (generatedAt DESC), com o total', async () => {
    const res = await list();
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as ListBody;
    assert.equal(body.total, 3);
    assert.equal(body.page, 1);
    assert.equal(body.limit, 25);
    assert.deepEqual(
      body.remittances.map((r) => r.remittanceId),
      [REM_NEWEST, REM_MIDDLE, REM_OLDEST],
    );
  });

  it('payableCount reflete a quantidade de documentos presos; status vem do registro', async () => {
    const res = await list();
    const body = res.json() as ListBody;

    const newest = body.remittances.find((r) => r.remittanceId === REM_NEWEST);
    const middle = body.remittances.find((r) => r.remittanceId === REM_MIDDLE);
    assert.ok(newest !== undefined && middle !== undefined);
    assert.equal(newest.status, 'Transmitted');
    assert.equal(newest.settledAt, '2026-08-13T15:00:00.000Z');
    assert.equal(newest.detail, 'consta em BACKUP');
    assert.equal(newest.payableCount, 1);
    assert.equal(middle.status, 'Queued');
    assert.equal(middle.settledAt, null);
    assert.equal(middle.detail, null);
    assert.equal(middle.payableCount, 2);
  });

  it('pagina por page/limit e mantém a ordem DESC entre páginas', async () => {
    const page1 = (await list('?page=1&limit=2')).json() as ListBody;
    assert.equal(page1.total, 3);
    assert.equal(page1.limit, 2);
    assert.deepEqual(
      page1.remittances.map((r) => r.remittanceId),
      [REM_NEWEST, REM_MIDDLE],
    );

    const page2 = (await list('?page=2&limit=2')).json() as ListBody;
    assert.equal(page2.page, 2);
    assert.deepEqual(
      page2.remittances.map((r) => r.remittanceId),
      [REM_OLDEST],
    );
  });

  it('recusa limit fora do intervalo (>100) com 400 antes do use case', async () => {
    const res = await list('?limit=500');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('recusa page=0 com 400', async () => {
    const res = await list('?page=0');
    assert.equal(res.statusCode, 400, res.body);
  });
});

describe('financial/http — GET /remittances/:id (#728) · detalhe', () => {
  it('devolve o detalhe com os títulos presos', async () => {
    const res = await detail(REM_MIDDLE);
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as DetailBody;
    assert.equal(body.remittanceId, REM_MIDDLE);
    assert.equal(body.payableCount, 2);
    assert.deepEqual([...body.payableIds].sort(), [DOC_B, DOC_C].sort());
  });

  it('remessa inexistente → 404', async () => {
    const res = await detail(REM_ABSENT);
    assert.equal(res.statusCode, 404, res.body);
  });

  it('id malformado (não-uuid) → 400 pela borda', async () => {
    const res = await detail('nao-e-uuid');
    assert.equal(res.statusCode, 400, res.body);
  });
});
