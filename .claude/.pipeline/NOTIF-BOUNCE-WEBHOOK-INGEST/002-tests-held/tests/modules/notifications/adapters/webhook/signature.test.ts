/**
 * W0 RED — NOTIF-BOUNCE-WEBHOOK-INGEST.
 *
 * Verificador de webhook agnostico (impl concreta HMAC). Par sign/verify:
 *  - signWebhook(secret, ts, rawBody) produz a assinatura que createHmacWebhookVerifier valida.
 *  - assinatura adulterada -> invalid-signature.
 *  - header de assinatura ausente -> missing-signature.
 *  - timestamp fora da janela de tolerancia -> timestamp-out-of-window (anti-replay, CA5).
 *  - payload assinado porem malformado (sem recipient num bounce) -> malformed-payload (CA7).
 *  - tipo nao-bounce/complaint -> evento normalizado type 'other' (CA6).
 *
 * Falham RED ate o W1 criar:
 *   src/modules/notifications/adapters/webhook/signature.ts
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createHmacWebhookVerifier,
  signWebhook,
} from '#src/modules/notifications/adapters/webhook/signature.ts';

const SECRET = 'whsec_test_0123456789';
const NOW = new Date('2026-06-19T03:00:00.000Z');
const NOW_SECONDS = Math.floor(NOW.getTime() / 1000);

const headersFor = (
  rawBody: string,
  ts: number = NOW_SECONDS,
): Readonly<Record<string, string | undefined>> => ({
  'x-webhook-signature': signWebhook(SECRET, ts, rawBody),
  'x-webhook-timestamp': String(ts),
});

describe('notifications/webhook/signature — createHmacWebhookVerifier', () => {
  const verifier = createHmacWebhookVerifier({ secret: SECRET, toleranceSeconds: 300 });

  it('par sign/verify: bounce valido -> ok com evento normalizado', () => {
    const rawBody = JSON.stringify({
      type: 'bounce',
      recipient: 'user@example.com',
      providerMessageId: 'pm-1',
      occurredAt: '2026-06-19T02:59:30.000Z',
    });

    const result = verifier({ rawBody, headers: headersFor(rawBody), now: NOW });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.type, 'bounce');
    assert.equal(result.value.recipient, 'user@example.com');
  });

  it('assinatura adulterada -> invalid-signature', () => {
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'user@example.com' });
    const headers = {
      'x-webhook-signature': 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      'x-webhook-timestamp': String(NOW_SECONDS),
    };

    const result = verifier({ rawBody, headers, now: NOW });

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.tag, 'invalid-signature');
  });

  it('header de assinatura ausente -> missing-signature', () => {
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'user@example.com' });

    const result = verifier({
      rawBody,
      headers: { 'x-webhook-timestamp': String(NOW_SECONDS) },
      now: NOW,
    });

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.tag, 'missing-signature');
  });

  it('timestamp fora da janela -> timestamp-out-of-window (anti-replay)', () => {
    const staleTs = NOW_SECONDS - 1000; // > 300s de tolerancia
    const rawBody = JSON.stringify({ type: 'bounce', recipient: 'user@example.com' });

    const result = verifier({ rawBody, headers: headersFor(rawBody, staleTs), now: NOW });

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.tag, 'timestamp-out-of-window');
  });

  it('payload assinado porem sem recipient num bounce -> malformed-payload', () => {
    const rawBody = JSON.stringify({ type: 'bounce' });

    const result = verifier({ rawBody, headers: headersFor(rawBody), now: NOW });

    assert.equal(result.ok, false);
    assert.equal(!result.ok && result.error.tag, 'malformed-payload');
  });

  it('tipo nao-bounce/complaint -> evento normalizado type other (no-op a montante)', () => {
    const rawBody = JSON.stringify({ type: 'delivered', recipient: 'user@example.com' });

    const result = verifier({ rawBody, headers: headersFor(rawBody), now: NOW });

    assert.equal(result.ok, true);
    assert.equal(result.ok && result.value.type, 'other');
  });
});
