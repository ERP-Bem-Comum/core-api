/**
 * W0 RED — NOTIF-BOUNCE-WEBHOOK-INGEST.
 *
 * Borda HTTP POST /api/v2/notifications/webhooks/email. Endpoint PUBLICO: a autenticacao
 * e a assinatura do payload (sem requireAuth). Cobre as CAs do 000-request.md:
 *   CA1 assinatura invalida/ausente   -> 401, nada gravado
 *   CA2 bounce valido                 -> 2xx, destinatario suprimido reason 'bounced'
 *   CA3 complaint valido              -> 2xx, reason 'complained'
 *   CA4 idempotencia (re-delivery)    -> 2xx ambas, 1 entrada
 *   CA5 anti-replay (ts velho)        -> 401
 *   CA6 evento ignorado ('delivered') -> 2xx no-op, nada gravado
 *   CA7 payload malformado assinado   -> 400
 *   CA8 OpenAPI                        -> /docs/json contem a rota
 *
 * Falham RED ate o W1 criar a borda:
 *   src/modules/notifications/public-api/http.ts
 *   src/modules/notifications/adapters/http/* (plugin + composition + schemas)
 *   src/modules/notifications/adapters/webhook/signature.ts
 *   src/modules/notifications/adapters/persistence/repos/suppression-list.in-memory.ts
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  notificationsHttpPlugin,
  buildNotificationsHttpDeps,
} from '#src/modules/notifications/public-api/http.ts';
import {
  createInMemorySuppressionList,
  type SuppressionStore,
} from '#src/modules/notifications/adapters/persistence/repos/suppression-list.in-memory.ts';
import {
  createHmacWebhookVerifier,
  signWebhook,
} from '#src/modules/notifications/adapters/webhook/signature.ts';

const SECRET = 'whsec_test_0123456789';
const URL = '/api/v2/notifications/webhooks/email';

const nowSeconds = (): number => Math.floor(Date.now() / 1000);

const signedHeaders = (
  rawBody: string,
  ts: number = nowSeconds(),
): Readonly<Record<string, string>> => ({
  'content-type': 'application/json',
  'x-webhook-signature': signWebhook(SECRET, ts, rawBody),
  'x-webhook-timestamp': String(ts),
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  store: SuppressionStore;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const store: SuppressionStore = new Map();
  const deps = {
    suppressionList: createInMemorySuppressionList(store),
    verifier: createHmacWebhookVerifier({ secret: SECRET, toleranceSeconds: 300 }),
  };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({ config, routes: [notificationsHttpPlugin(deps)] });
  handle = { app, store, teardown: () => app.close() };
});

after(async () => {
  await handle.teardown();
});

describe('notifications/http — webhook de bounce/complaint (ingestao)', () => {
  it('CA1: assinatura invalida -> 401 e nada gravado', async () => {
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'a@example.com' });
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': 'deadbeef'.repeat(8),
        'x-webhook-timestamp': String(nowSeconds()),
      },
      payload: rawBody,
    });
    assert.equal(res.statusCode, 401, res.body);
    assert.equal(handle.store.size, 0);
  });

  it('CA1: assinatura ausente -> 401', async () => {
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'a@example.com' });
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: { 'content-type': 'application/json' },
      payload: rawBody,
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it('CA2: bounce valido -> 2xx e destinatario suprimido (bounced)', async () => {
    const rawBody = JSON.stringify({
      type: 'bounce',
      recipient: 'bounce@example.com',
      providerMessageId: 'pm-2',
      occurredAt: '2026-06-19T03:00:00.000Z',
    });
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: signedHeaders(rawBody),
      payload: rawBody,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(handle.store.get('bounce@example.com')?.reason, 'bounced');
  });

  it('CA3: complaint valido -> 2xx e destinatario suprimido (complained)', async () => {
    const rawBody = JSON.stringify({ type: 'complaint', recipient: 'spam@example.com' });
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: signedHeaders(rawBody),
      payload: rawBody,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(handle.store.get('spam@example.com')?.reason, 'complained');
  });

  it('CA4: re-delivery do mesmo webhook -> 2xx ambas, 1 entrada', async () => {
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'dup@example.com' });
    const headers = signedHeaders(rawBody);

    const first = await handle.app.inject({ method: 'POST', url: URL, headers, payload: rawBody });
    const second = await handle.app.inject({ method: 'POST', url: URL, headers, payload: rawBody });

    assert.equal(first.statusCode, 200, first.body);
    assert.equal(second.statusCode, 200, second.body);
    const onlyDup = [...handle.store.keys()].filter((k) => k === 'dup@example.com');
    assert.equal(onlyDup.length, 1);
  });

  it('CA5: timestamp fora da janela -> 401 (anti-replay)', async () => {
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'replay@example.com' });
    const staleTs = nowSeconds() - 1000;
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: signedHeaders(rawBody, staleTs),
      payload: rawBody,
    });
    assert.equal(res.statusCode, 401, res.body);
    assert.equal(handle.store.has('replay@example.com'), false);
  });

  it('CA6: evento ignorado (delivered) -> 2xx no-op, nada gravado', async () => {
    const rawBody = JSON.stringify({ type: 'delivered', recipient: 'ok@example.com' });
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: signedHeaders(rawBody),
      payload: rawBody,
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(handle.store.has('ok@example.com'), false);
  });

  it('CA7: payload assinado porem malformado -> 400', async () => {
    const rawBody = JSON.stringify({ type: 'bounce' }); // sem recipient
    const res = await handle.app.inject({
      method: 'POST',
      url: URL,
      headers: signedHeaders(rawBody),
      payload: rawBody,
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA8: OpenAPI /docs/json contem a rota do webhook', async () => {
    const res = await handle.app.inject({ method: 'GET', url: '/docs/json' });
    assert.equal(res.statusCode, 200, res.body);
    const doc = JSON.parse(res.body) as { paths: Record<string, unknown> };
    assert.ok(
      Object.keys(doc.paths).includes(URL),
      `esperava ${URL} em paths; veio: ${Object.keys(doc.paths).join(', ')}`,
    );
  });
});

describe('notifications/http — composition root (driver memory)', () => {
  it('buildNotificationsHttpDeps(memory) expoe suppressionList + verifier + shutdown', async () => {
    const deps = await buildNotificationsHttpDeps({
      driver: 'memory',
      webhookSecret: SECRET,
      toleranceSeconds: 300,
    });
    assert.equal(typeof deps.suppressionList.isSuppressed, 'function');
    assert.equal(typeof deps.verifier, 'function');
    await deps.shutdown();
  });
});
