/**
 * W0 (RED) - Tests para withSandboxRedirect (decorator de EmailSender).
 *
 * Ticket: NOTIF-EMAIL-DEPLOY-CONFIG. ADR-0010 "Decorators opcionais".
 *
 * Cobre CA9:
 *   - to/cc/bcc reescritos para a caixa de sandbox; subject/from/body preservados;
 *   - sender subjacente recebe a mensagem reescrita (delegacao);
 *   - quando o sandbox nao se aplica (decorator nao montado), comportamento e o do sender original
 *     (validado em build-email-sender.test.ts).
 *
 * Estes tests DEVEM FALHAR em W0 - sandbox-redirect.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { withSandboxRedirect } from '#src/modules/notifications/adapters/email/sandbox-redirect.ts';
import { createInMemoryEmailSender } from '#src/modules/notifications/adapters/email/in-memory.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailSubject,
} from '#src/modules/notifications/public-api/index.ts';

const addr = (raw: string): EmailAddress => {
  const r = parseEmailAddress(raw);
  if (!r.ok) throw new Error(`fixture addr invalido: ${raw}`);
  return r.value;
};

const subj = (raw: string): EmailSubject => {
  const r = parseEmailSubject(raw);
  if (!r.ok) throw new Error(`fixture subject invalido: ${raw}`);
  return r.value;
};

describe('withSandboxRedirect', () => {
  it('CA9: reescreve to para a caixa de sandbox e delega ao sender', async () => {
    // Arrange
    const inner = createInMemoryEmailSender();
    const sandbox = addr('qa@example.com');
    const sender = withSandboxRedirect(inner, sandbox);

    // Act
    const r = await sender.send({
      from: addr('no-reply@example.com'),
      to: [addr('user@destino.com')],
      subject: subj('Assunto'),
      textBody: 'corpo',
    });

    // Assert
    assert.equal(r.ok, true);
    const sent = inner.getSent();
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0]?.to, [sandbox]);
  });

  it('CA9: reescreve cc e bcc para a caixa de sandbox', async () => {
    // Arrange
    const inner = createInMemoryEmailSender();
    const sandbox = addr('qa@example.com');
    const sender = withSandboxRedirect(inner, sandbox);

    // Act
    await sender.send({
      from: addr('no-reply@example.com'),
      to: [addr('a@x.com'), addr('b@x.com')],
      cc: [addr('c@x.com')],
      bcc: [addr('d@x.com')],
      subject: subj('Assunto'),
      textBody: 'corpo',
    });

    // Assert
    const msg = inner.getSent()[0];
    assert.deepEqual(msg?.to, [sandbox]);
    assert.deepEqual(msg?.cc, [sandbox]);
    assert.deepEqual(msg?.bcc, [sandbox]);
  });

  it('CA9: preserva from, subject e corpo ao redirecionar', async () => {
    // Arrange
    const inner = createInMemoryEmailSender();
    const sender = withSandboxRedirect(inner, addr('qa@example.com'));
    const from = addr('no-reply@example.com');
    const subject = subj('Assunto preservado');

    // Act
    await sender.send({
      from,
      to: [addr('user@destino.com')],
      subject,
      textBody: 'corpo preservado',
      htmlBody: '<p>html</p>',
    });

    // Assert
    const msg = inner.getSent()[0];
    assert.equal(msg?.from, from);
    assert.equal(msg?.subject, subject);
    assert.equal(msg?.textBody, 'corpo preservado');
    assert.equal(msg?.htmlBody, '<p>html</p>');
  });
});
