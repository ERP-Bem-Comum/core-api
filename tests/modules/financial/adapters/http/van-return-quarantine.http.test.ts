/**
 * VAN-RETURN-QUARANTINE (#753) — borda HTTP: GET /api/v2/financial/van-returns/quarantine.
 *
 * É o que fecha o "consultável" da DoD da issue: sem esta rota a quarentena só existiria para quem
 * tem acesso ao banco. Read-only — quem escreve é o worker `van-return-scan`.
 *
 * Driver memory (sem Docker); auth via hooks FAKE (o "token" Bearer carrega as permissões por
 * vírgula). A quarentena é semeada pelo seam de composição `vanReturnQuarantine`.
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
import { createInMemoryVanReturnQuarantine } from '#src/modules/financial/adapters/persistence/repos/van-return-quarantine-store.in-memory.ts';

const READER = 'remittance:read';
const PLAIN = 'none'; // token válido, sem a permissão → 403 (não 401)
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const URL = '/api/v2/financial/van-returns/quarantine';

const KEY_SEM_ENVELOPE = 'retorno/PAG_000000.20260819110000_0001.RET';
const KEY_HASH_DIVERGENTE = 'retorno/PAG_000000.20260819110000_0002.RET';
const KEY_LIBERADA = 'retorno/PAG_000000.20260819110000_0003.RET';

const HASH_OBSERVADO = 'a'.repeat(64);
const HASH_DECLARADO = 'b'.repeat(64);

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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

type Item = Readonly<{
  objectKey: string;
  reason: string;
  observedSha256: string;
  expectedSha256: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  releasedAt: string | null;
}>;

type Body = Readonly<{ quarantined: readonly Item[]; total: number }>;

before(async () => {
  const quarantine = createInMemoryVanReturnQuarantine();

  await quarantine.record([
    {
      key: KEY_SEM_ENVELOPE,
      reason: 'missing-provenance',
      observedSha256: HASH_OBSERVADO,
      seenAt: '2026-08-19T12:00:00.000Z',
    },
    {
      key: KEY_HASH_DIVERGENTE,
      reason: 'hash-mismatch',
      observedSha256: HASH_OBSERVADO,
      expectedSha256: HASH_DECLARADO,
      seenAt: '2026-08-19T12:00:00.000Z',
    },
    {
      key: KEY_LIBERADA,
      reason: 'missing-provenance',
      observedSha256: HASH_OBSERVADO,
      seenAt: '2026-08-19T12:00:00.000Z',
    },
  ]);
  // O envelope chegou depois: o objeto passou a ter proveniência e saiu da fila.
  await quarantine.release([KEY_LIBERADA], '2026-08-19T12:05:00.000Z');

  const deps = await buildFinancialHttpDeps({ driver: 'memory', vanReturnQuarantine: quarantine });
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

const get = async (query = '', perms = READER) =>
  handle.app.inject({ method: 'GET', url: `${URL}${query}`, headers: bearer(perms) });

describe('financial/http — GET /van-returns/quarantine (#753) · RBAC', () => {
  it('sem Authorization → 401', async () => {
    const res = await handle.app.inject({ method: 'GET', url: URL });
    assert.equal(res.statusCode, 401, res.body);
  });

  it('token sem remittance:read → 403', async () => {
    const res = await get('', PLAIN);
    assert.equal(res.statusCode, 403, res.body);
  });
});

describe('financial/http — GET /van-returns/quarantine (#753) · consulta', () => {
  it('por padrão devolve só o que está PRESO — a pergunta operacional é "o que está parado"', async () => {
    const res = await get();
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json<Body>();
    assert.equal(body.total, 2);
    assert.deepEqual(
      body.quarantined.map((q) => q.objectKey).sort(),
      [KEY_SEM_ENVELOPE, KEY_HASH_DIVERGENTE].sort(),
    );
    assert.ok(
      !body.quarantined.some((q) => q.objectKey === KEY_LIBERADA),
      'o liberado não aparece na consulta padrão',
    );
  });

  it('includeReleased=true traz o histórico — liberar não é apagar', async () => {
    const res = await get('?includeReleased=true');
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json<Body>();
    assert.equal(body.total, 3);
    const liberada = body.quarantined.find((q) => q.objectKey === KEY_LIBERADA);
    assert.equal(liberada?.releasedAt, '2026-08-19T12:05:00.000Z');
  });

  // ⚠️ O caso que justifica o enum no schema. Com `z.coerce.boolean()` a string "false" — não-vazia
  // — viraria `true`, e a rota devolveria o histórico inteiro para quem pediu explicitamente o
  // contrário. Erro silencioso: 200, corpo bem formado, resposta errada.
  it('includeReleased=false NÃO traz o liberado', async () => {
    const res = await get('?includeReleased=false');
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json<Body>();
    assert.equal(body.total, 2, '"false" tem de significar false');
  });

  it('includeReleased fora das duas grafias → 400 antes do use case', async () => {
    const res = await get('?includeReleased=talvez');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('o hash DECLARADO acompanha o hash-mismatch, e é null quando não houve declaração', async () => {
    const body = (await get()).json<Body>();

    const divergente = body.quarantined.find((q) => q.objectKey === KEY_HASH_DIVERGENTE);
    assert.equal(divergente?.reason, 'hash-mismatch');
    // Sem os dois lados, "divergiu" não distingue arquivo alterado de envelope apontando para outro
    // objeto — e a ação do operador é diferente em cada caso.
    assert.equal(divergente?.expectedSha256, HASH_DECLARADO);
    assert.equal(divergente?.observedSha256, HASH_OBSERVADO);

    const semEnvelope = body.quarantined.find((q) => q.objectKey === KEY_SEM_ENVELOPE);
    assert.equal(
      semEnvelope?.expectedSha256,
      null,
      'sem envelope não houve declaração — `null`, não string vazia',
    );
  });

  it('a chave do objeto é o identificador — o nome do arquivo não basta', async () => {
    const body = (await get()).json<Body>();
    // O nome é atribuído pelo banco e ganha sufixo desempatador em colisão; o caminho completo é o
    // que permite achar o objeto no bucket.
    assert.ok(body.quarantined.every((q) => q.objectKey.startsWith('retorno/')));
  });
});
