/**
 * NOTIF-EMAIL-RATE-LIMIT (#133) — W0 RED.
 *
 * Decorator `withRateLimit` do EmailSender: sliding window in-memory por destinatario.
 * Ao exceder maxPerWindow na janela, retorna err `rate-limited` SEM delegar ao inner sender
 * (descarte anti-flood; o delivery mapeia rate-limited -> processado). Clock injetado p/ testar a janela.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import {
  withRateLimit,
  rateLimitConfigFromEnv,
} from '#src/modules/notifications/adapters/email/rate-limit.ts';
import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type { EmailSender } from '#src/modules/notifications/application/ports/email-sender.ts';
import type { EmailMessage } from '#src/modules/notifications/domain/email/types.ts';

const addr = (raw: string): EmailAddress.EmailAddress => {
  const r = EmailAddress.parse(raw);
  if (!r.ok) throw new Error(`bad addr: ${raw}`);
  return r.value;
};
const subj = (() => {
  const r = EmailSubject.parse('Assunto');
  if (!r.ok) throw new Error('bad subj');
  return r.value;
})();
const msgTo = (raw: string): EmailMessage => ({
  from: addr('from@example.com'),
  to: [addr(raw)],
  subject: subj,
  textBody: 'corpo',
});

const countingSender = (): { sender: EmailSender; calls: () => number } => {
  let calls = 0;
  return {
    sender: {
      send: () => {
        calls += 1;
        return Promise.resolve(ok({ messageId: 'm', acceptedAt: '2026-01-01T00:00:00.000Z' }));
      },
    },
    calls: () => calls,
  };
};

describe('withRateLimit — decorator anti-flood do EmailSender (#133)', () => {
  it('CA1: excede o limite no MESMO destinatario -> err rate-limited, sem chamar o inner', async () => {
    const { sender, calls } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 2 }, () => 0);

    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
    const third = await limited.send(msgTo('a@x.com'));
    assert.equal(third.ok, false);
    if (!third.ok) assert.equal(third.error.tag, 'rate-limited');
    assert.equal(calls(), 2, 'o inner sender NAO deve ser chamado no envio excedente');
  });

  it('CA2: destinatarios DISTINTOS tem orcamentos independentes', async () => {
    const { sender } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 1 }, () => 0);

    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
    assert.equal((await limited.send(msgTo('b@x.com'))).ok, true); // outro destinatario, sem efeito cruzado
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, false); // 'a' ja estourou
  });

  it('CA3: apos a janela expirar, o destinatario volta a enviar', async () => {
    let now = 0;
    const { sender } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 1 }, () => now);

    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, false); // dentro da janela
    now = 1001; // janela expirou
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
  });

  it('CA4: dentro do limite, delega ao inner sender (envia)', async () => {
    const { sender, calls } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 3 }, () => 0);
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
    assert.equal(calls(), 1);
  });

  it('CA2b: e case-insensitive no destinatario (A@x == a@x)', async () => {
    const { sender } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 1 }, () => 0);
    assert.equal((await limited.send(msgTo('User@X.com'))).ok, true);
    assert.equal((await limited.send(msgTo('user@x.com'))).ok, false);
  });

  it('B1: respeita maxKeys — a chave mais antiga e evicta (Map bounded, anti resource-exhaustion)', async () => {
    const { sender } = countingSender();
    const limited = withRateLimit(
      sender,
      { windowMs: 100_000, maxPerWindow: 1, maxKeys: 2 },
      () => 0,
    );
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true); // 'a' no limite
    assert.equal((await limited.send(msgTo('b@x.com'))).ok, true); // 'b' no limite (Map cheio: 2)
    assert.equal((await limited.send(msgTo('c@x.com'))).ok, true); // 'c' entra -> evicta 'a' (FIFO)
    // 'a' foi evicto -> orcamento resetado -> envia de novo (se estivesse retido, seria rate-limited).
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, true);
  });

  it('M2: destinatario em cc/bcc conta para o limite (sem bypass)', async () => {
    const { sender } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 1 }, () => 0);
    const withCc: EmailMessage = {
      from: addr('from@example.com'),
      to: [addr('t@x.com')],
      cc: [addr('c@x.com')],
      subject: subj,
      textBody: 'x',
    };
    assert.equal((await limited.send(withCc)).ok, true); // conta 't' e 'c'
    assert.equal((await limited.send(msgTo('c@x.com'))).ok, false); // 'c' ja estourou via cc
  });

  it('m1: `to` com endereco repetido conta 1x na mesma mensagem (dedup)', async () => {
    const { sender } = countingSender();
    const limited = withRateLimit(sender, { windowMs: 1000, maxPerWindow: 1 }, () => 0);
    const dup: EmailMessage = {
      from: addr('from@example.com'),
      to: [addr('a@x.com'), addr('a@x.com')],
      subject: subj,
      textBody: 'x',
    };
    assert.equal((await limited.send(dup)).ok, true); // dedup -> nao estoura na propria mensagem
    assert.equal((await limited.send(msgTo('a@x.com'))).ok, false); // 2a mensagem: agora estoura
  });
});

describe('rateLimitConfigFromEnv — fail-loud (#133 M3)', () => {
  it('off quando EMAIL_RATE_LIMIT_MAX ausente', () => {
    assert.equal(rateLimitConfigFromEnv({}).kind, 'off');
  });
  it('on com policy quando valido (window default 1h)', () => {
    const c = rateLimitConfigFromEnv({ EMAIL_RATE_LIMIT_MAX: '5' });
    assert.equal(c.kind, 'on');
    if (c.kind === 'on') {
      assert.equal(c.policy.maxPerWindow, 5);
      assert.equal(c.policy.windowMs, 3_600_000);
    }
  });
  it('invalid (nao off) quando presente porem malformado', () => {
    assert.equal(rateLimitConfigFromEnv({ EMAIL_RATE_LIMIT_MAX: '0' }).kind, 'invalid');
    assert.equal(rateLimitConfigFromEnv({ EMAIL_RATE_LIMIT_MAX: 'abc' }).kind, 'invalid');
    assert.equal(
      rateLimitConfigFromEnv({ EMAIL_RATE_LIMIT_MAX: '5', EMAIL_RATE_LIMIT_WINDOW_MS: '-1' }).kind,
      'invalid',
    );
  });
});
