/**
 * W0 (RED) - Tests para InMemoryEmailSender adapter.
 *
 * Ticket: CTR-EMAIL-PORT.
 *
 * Cobre CA-T7..T10:
 *   - T7: send retorna ok com receipt (messageId UUID + acceptedAt ISO)
 *   - T8: getSent acumula apos multiplos sends
 *   - T9: clear reseta a lista de enviados
 *   - T10: smoke type-level - InMemoryEmailSender e assignable a EmailSender
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createInMemoryEmailSender } from '#src/modules/notifications/adapters/email/in-memory.ts';
import type { EmailSender } from '#src/modules/notifications/application/ports/email-sender.ts';
import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';
import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';
import type { EmailMessage } from '#src/modules/notifications/domain/email/types.ts';

// Fixture helper - encapsula a construcao de EmailMessage valido para tests
const makeMessage = (
  overrides: Partial<{ toRaw: string; subjectRaw: string }> = {},
): EmailMessage => {
  const fromR = EmailAddress.parse('sender@example.com');
  const toR = EmailAddress.parse(overrides.toRaw ?? 'rcpt@example.com');
  const subjectR = EmailSubject.parse(overrides.subjectRaw ?? 'Hello');
  if (!fromR.ok || !toR.ok || !subjectR.ok) {
    throw new Error('fixture invalida');
  }
  return {
    from: fromR.value,
    to: [toR.value],
    subject: subjectR.value,
    textBody: 'corpo do email',
  };
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

describe('createInMemoryEmailSender', () => {
  it('CA-T7: send retorna ok com receipt (messageId UUID + acceptedAt ISO)', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    const msg = makeMessage();

    // Act
    const r = await sender.send(msg);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.match(
        r.value.messageId,
        UUID_V4,
        `messageId deve ser UUID v4; obtido: ${r.value.messageId}`,
      );
      assert.match(
        r.value.acceptedAt,
        ISO_8601,
        `acceptedAt deve ser ISO-8601; obtido: ${r.value.acceptedAt}`,
      );
    }
  });

  it('CA-T8: getSent acumula apos multiplos sends', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();

    // Act
    await sender.send(makeMessage({ toRaw: 'a@example.com' }));
    await sender.send(makeMessage({ toRaw: 'b@example.com' }));
    await sender.send(makeMessage({ toRaw: 'c@example.com' }));
    const sent = sender.getSent();

    // Assert
    assert.equal(sent.length, 3);
    assert.equal(sent[0]?.to[0], 'a@example.com');
    assert.equal(sent[1]?.to[0], 'b@example.com');
    assert.equal(sent[2]?.to[0], 'c@example.com');
  });

  it('CA-T9: clear reseta a lista de enviados', async () => {
    // Arrange
    const sender = createInMemoryEmailSender();
    await sender.send(makeMessage());
    await sender.send(makeMessage());
    assert.equal(sender.getSent().length, 2);

    // Act
    sender.clear();

    // Assert
    assert.equal(sender.getSent().length, 0);
  });

  it('CA-T10: smoke type-level - InMemoryEmailSender e assignable a EmailSender', () => {
    // Act - se nao compilar, falha aqui
    const inMemory = createInMemoryEmailSender();
    const asPort: EmailSender = inMemory;

    // Assert - smoke: ambos tem send
    assert.equal(typeof asPort.send, 'function');
  });
});
