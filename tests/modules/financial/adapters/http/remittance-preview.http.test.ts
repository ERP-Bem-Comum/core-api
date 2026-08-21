/**
 * REMITTANCE-PREVIEW (#720) — borda HTTP: POST /api/v2/financial/remittances:preview.
 *
 * O pré-voo do lote: responde "o que sai e o que não sai" ANTES de gerar, sem consumir NSA, sem
 * prender documento e sem tocar no bucket. É o que sustenta a decisão (a) da P.O. na #708 —
 * "título incompleto sai da remessa, nunca bloqueia o lote, com alerta por título".
 *
 * Driver memory (sem Docker); auth via hooks FAKE (o "token" Bearer carrega as permissões por
 * vírgula). Fastify.inject por cenário (ADR-0037).
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
import { createInMemoryRemittancePreviewReader } from '#src/modules/financial/adapters/persistence/repos/remittance-preview-reader.in-memory.ts';

const READER = 'remittance:read';
const PLAIN = 'none'; // token válido, sem a permissão de remessa → 403 (não 401)
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const URL = '/api/v2/financial/remittances:preview';

// UMA nota, TRÊS títulos, TRÊS formas — o arranjo que a fatia existe para suportar. O pai sai por
// boleto, um irmão por PIX e outro por câmbio (fora da VAN), e o pré-voo responde por título.
const DOC_ORIGEM = '99999999-9999-4999-8999-999999999999';
const PAY_BOLETO = '11111111-1111-4111-8111-111111111111';
const PAY_PIX_SEM_CHAVE = '22222222-2222-4222-8222-222222222222';
const PAY_CAMBIO = '33333333-3333-4333-8333-333333333333';
const PAY_SUMIDO = '44444444-4444-4444-8444-444444444444';

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

// Boleto pago por código de barras: NÃO depende de conta bancária, e é por isso que o favorecido
// entra sem bloco algum (#708, CA5).
const reader = createInMemoryRemittancePreviewReader([
  {
    documentId: DOC_ORIGEM,
    payableId: PAY_BOLETO,
    status: 'Approved',
    paymentMethod: 'Boleto',
    // 44 dígitos EXATOS — é o código de barras (G063), não a linha digitável de 47.
    paymentDetail: '23791234500000150000123456789012345678901234',
    valueCents: 150_00,
    payee: { bank: null, agency: null, accountNumber: null, checkDigit: null, pixKey: null },
  },
  {
    documentId: DOC_ORIGEM,
    payableId: PAY_PIX_SEM_CHAVE,
    status: 'Approved',
    paymentMethod: 'PIX',
    paymentDetail: null,
    valueCents: 80_00,
    payee: { bank: null, agency: null, accountNumber: null, checkDigit: null, pixKey: null },
  },
  {
    documentId: DOC_ORIGEM,
    payableId: PAY_CAMBIO,
    status: 'Approved',
    paymentMethod: 'Cambio',
    paymentDetail: null,
    valueCents: 500_00,
    payee: null,
  },
]);

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

type PreviewBody = Readonly<{
  lines: readonly Readonly<{
    payableId: string;
    documentId: string | null;
    status: string;
    route: string | null;
    missing: readonly string[];
    gaps: readonly Readonly<{ field: string; reason: string }>[];
    valueCents: string;
  }>[];
  readyCount: number;
  blockedCount: number;
  outOfVanCount: number;
  notFoundCount: number;
  readyTotalCents: string;
  blockedTotalCents: string;
}>;

before(async () => {
  const deps = await buildFinancialHttpDeps({
    driver: 'memory',
    remittancePreviewReader: reader,
  });
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

const preview = async (payableIds: readonly string[], perms = READER) =>
  handle.app.inject({ method: 'POST', url: URL, headers: bearer(perms), payload: { payableIds } });

describe('financial/http — POST /remittances:preview (#720) · RBAC', () => {
  it('sem Authorization → 401', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      payload: { payableIds: [PAY_BOLETO] },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  // A permissão é de LEITURA, não a de disparo: conferir o que sai não é mandar dinheiro ao banco.
  it('token sem remittance:read → 403', async () => {
    const res = await preview([PAY_BOLETO], PLAIN);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('a permissão de geração não vale como leitura', async () => {
    const res = await preview([PAY_BOLETO], 'remittance:generate');
    assert.equal(res.statusCode, 403, res.body);
  });
});

describe('financial/http — POST /remittances:preview (#720) · o que o operador vê', () => {
  it('CA1: boleto com código de barras sai, sem depender de conta bancária', async () => {
    const res = await preview([PAY_BOLETO]);
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as PreviewBody;
    const line = body.lines[0];
    assert.ok(line !== undefined);
    assert.equal(line.status, 'ready');
    assert.equal(line.route, 'billet');
    assert.deepEqual(line.missing, []);
    assert.equal(body.readyCount, 1);
    assert.equal(body.readyTotalCents, '15000');
  });

  it('CA1: PIX sem chave é impedido, e a resposta diz QUAL campo falta', async () => {
    const res = await preview([PAY_PIX_SEM_CHAVE]);
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as PreviewBody;
    const line = body.lines[0];
    assert.ok(line !== undefined);
    assert.equal(line.status, 'blocked');
    assert.equal(line.route, 'pix');
    // O campo, não uma frase: é o que a tela usa para levar o operador ao input certo.
    assert.deepEqual(line.missing, ['pix-key']);
    assert.deepEqual(line.gaps, [{ field: 'pix-key', reason: 'missing' }]);
    assert.equal(body.blockedCount, 1);
  });

  it('câmbio fica fora da VAN — não é impedimento, é rota que o layout não transporta', async () => {
    const res = await preview([PAY_CAMBIO]);
    const body = res.json() as PreviewBody;
    const line = body.lines[0];

    assert.ok(line !== undefined);
    assert.equal(line.status, 'out-of-van');
    assert.equal(line.route, null);
    assert.deepEqual(line.missing, [], 'não há campo a preencher: nenhum cadastro resolve câmbio');
  });

  // O id selecionado tem de voltar na resposta mesmo que o documento não exista mais. Sumir com ele
  // seria o defeito que este pré-voo existe para corrigir.
  it('documento inexistente volta como not-found, não some da resposta', async () => {
    const res = await preview([PAY_BOLETO, PAY_SUMIDO]);
    const body = res.json() as PreviewBody;

    assert.equal(body.lines.length, 2);
    assert.equal(body.lines[1]?.payableId, PAY_SUMIDO);
    // Sem o título lido não há nota a declarar — `null` é a resposta honesta.
    assert.equal(body.lines[1]?.documentId, null);
    assert.equal(body.lines[1]?.status, 'not-found');
    assert.equal(body.notFoundCount, 1);
  });

  it('a ordem da resposta é a da seleção', async () => {
    const res = await preview([PAY_CAMBIO, PAY_BOLETO, PAY_PIX_SEM_CHAVE]);
    const body = res.json() as PreviewBody;

    assert.deepEqual(
      body.lines.map((l) => l.payableId),
      [PAY_CAMBIO, PAY_BOLETO, PAY_PIX_SEM_CHAVE],
    );
  });

  // O valor fora da VAN não entra em nenhum dos dois totais: somá-lo ao impedido inflaria o número
  // que o operador usa para decidir se vale correr atrás do cadastro.
  it('os totais separam o que sai, o que está impedido e o que não pertence à VAN', async () => {
    const res = await preview([PAY_BOLETO, PAY_PIX_SEM_CHAVE, PAY_CAMBIO]);
    const body = res.json() as PreviewBody;

    assert.equal(body.readyTotalCents, '15000');
    assert.equal(body.blockedTotalCents, '8000');
    assert.equal(body.outOfVanCount, 1);
  });
});

describe('financial/http — POST /remittances:preview (#720) · borda', () => {
  it('recusa seleção vazia com 400, antes do use case', async () => {
    const res = await preview([]);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('recusa id que não é uuid com 400', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(READER),
      payload: { payableIds: ['nao-e-uuid'] },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('recusa campo desconhecido no corpo', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: bearer(READER),
      payload: { payableIds: [PAY_BOLETO], gerar: true },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  // Path irmão não pode cair no custom method — a regex `^:preview$` fixa o literal.
  it('path irmão fora do custom method dá 404', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/remittancesXYZ',
      headers: bearer(READER),
      payload: { payableIds: [PAY_BOLETO] },
    });
    assert.equal(res.statusCode, 404, res.body);
  });
});
