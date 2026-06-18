/**
 * NOTIF-EMAIL-OUTBOX · W0 (RED) — piloto: PasswordResetMailer ENFILEIRA (nao envia sincrono).
 *
 * O adapter de reset passa a usar o EmailOutbox (entrega assincrona pelo worker) em vez de
 * chamar EmailSender.send no request. Cobre:
 *   - CA7: sendResetLink com e-mail valido -> enfileira UMA EmailMessage (payload com o link).
 *   - CA8 (borda do adapter): e-mail malformado -> nada enfileirado, sem vazar existencia.
 *
 * A anti-enumeracao end-to-end (conta inexistente/inativa -> 202, nada enfileirado) e
 * garantida pelo use case requestPasswordReset, coberta no teste do use case.
 *
 * DEVE FALHAR em W0 (makeOutboxPasswordResetMailer + InMemoryEmailOutbox inexistentes). ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseEmailAddress } from '#src/modules/notifications/public-api/index.ts';
import { InMemoryEmailOutbox } from '#src/modules/notifications/adapters/outbox/email-outbox.in-memory.ts';
import { makeOutboxPasswordResetMailer } from '#src/modules/auth/adapters/notifications/password-reset-mailer.outbox.ts';

const RESET_URL = 'https://app.local/reset-password?token=abc123';

const fromAddr = () => {
  const r = parseEmailAddress('noreply@bemcomum.local');
  if (!r.ok) throw new Error('setup');
  return r.value;
};

describe('makeOutboxPasswordResetMailer (piloto)', () => {
  let store: ReturnType<typeof InMemoryEmailOutbox>;
  beforeEach(() => {
    store = InMemoryEmailOutbox();
  });

  it('CA7: e-mail valido -> enfileira uma EmailMessage com o link no corpo', async () => {
    const mailer = makeOutboxPasswordResetMailer({ emailOutbox: store.port, from: fromAddr() });

    const r = await mailer.sendResetLink({ email: 'user@example.com', resetUrl: RESET_URL });

    assert.equal(r.ok, true);
    const pending = store.pending();
    assert.equal(pending.length, 1);
    const row = pending[0];
    assert.ok(row !== undefined);
    if (row !== undefined) {
      assert.equal(row.processedAt, null);
      const parsed = JSON.parse(row.payload) as { textBody: string; to: readonly string[] };
      assert.ok(parsed.textBody.includes(RESET_URL));
      assert.deepEqual([...parsed.to], ['user@example.com']);
    }
  });

  it('CA8 (borda): e-mail malformado -> nada enfileirado, retorna reset-mail-failed', async () => {
    const mailer = makeOutboxPasswordResetMailer({ emailOutbox: store.port, from: fromAddr() });
    const r = await mailer.sendResetLink({ email: 'nao-e-email', resetUrl: RESET_URL });
    assert.equal(r.ok, false);
    assert.equal(store.all().length, 0);
  });
});
