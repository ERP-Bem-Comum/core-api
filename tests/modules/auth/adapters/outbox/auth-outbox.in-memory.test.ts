/**
 * AUTH-DOMAIN-OUTBOX — W0 (RED) — adapter InMemory do outbox de eventos de dominio do auth.
 *
 * Espelha partners/adapters/outbox/outbox.in-memory.ts (GENERICO: append recebe OutboxMessage[]).
 * Cobre CA1 (forma da row) + CA7 (payload autocontido). DEVE FALHAR em W0: o adapter
 * InMemoryAuthOutbox e o port OutboxPort do auth ainda nao existem. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { InMemoryAuthOutbox } from '#src/modules/auth/adapters/outbox/auth-outbox.in-memory.ts';
import type { OutboxMessage } from '#src/modules/auth/application/ports/outbox.ts';

const msg = (over: Partial<OutboxMessage> = {}): OutboxMessage => ({
  eventId: '11111111-1111-4111-8111-111111111111',
  aggregateId: '22222222-2222-4222-8222-222222222222',
  aggregateType: 'User',
  eventType: 'PasswordResetRequested',
  occurredAt: new Date('2026-06-18T12:00:00.000Z'),
  payload: JSON.stringify({ email: 'user@example.com', resetUrl: 'https://app/reset?token=x' }),
  ...over,
});

describe('InMemoryAuthOutbox (AUTH-DOMAIN-OUTBOX)', () => {
  it('append grava a mensagem como row pendente (processed_at null, attempts 0, schema_version 1)', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    // Act
    const r = await outbox.port.append([msg()]);
    // Assert
    assert.equal(r.ok, true);
    const rows = outbox.all();
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.processedAt, null);
    assert.equal(rows[0]?.attempts, 0);
    assert.equal(rows[0]?.schemaVersion, 1);
    assert.equal(rows[0]?.eventType, 'PasswordResetRequested');
  });

  it('payload e autocontido (destinatario + link) e nao e logado', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    // Act
    await outbox.port.append([msg()]);
    // Assert
    const payload = JSON.parse(outbox.all()[0]?.payload ?? '{}') as Record<string, unknown>;
    assert.equal(payload['email'], 'user@example.com');
    assert.equal(payload['resetUrl'], 'https://app/reset?token=x');
  });

  it('rejeita eventId duplicado (espelha PK do banco)', async () => {
    // Arrange
    const outbox = InMemoryAuthOutbox();
    await outbox.port.append([msg()]);
    // Act
    const dup = await outbox.port.append([msg()]);
    // Assert
    assert.equal(dup.ok, false);
  });
});
