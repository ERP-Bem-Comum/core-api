/**
 * W0 (RED) - Tests para EmailAddress (branded type + smart constructor).
 *
 * Ticket: CTR-EMAIL-PORT.
 *
 * Cobre CA-T1..T3:
 *   - T1: parse de email valido retorna ok
 *   - T2: parse de string sem '@' retorna err('invalid-email-format')
 *   - T3: parse de string > 320 chars (RFC 5321) retorna err('email-address-too-long')
 *
 * Estes tests DEVEM FALHAR em W0 - src/modules/notifications/ ainda nao existe.
 *
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as EmailAddress from '#src/modules/notifications/domain/email/address.ts';

describe('EmailAddress.parse', () => {
  it('CA-T1: email valido retorna ok', () => {
    // Act
    const r = EmailAddress.parse('valid@example.com');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      // tipo brandado: o valor permanece a string original
      assert.equal(r.value, 'valid@example.com');
    }
  });

  it('CA-T2: string sem @ retorna err invalid-email-format', () => {
    // Act
    const r = EmailAddress.parse('invalid');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'invalid-email-format');
    }
  });

  it('CA-T3: string > 320 chars retorna err email-address-too-long', () => {
    // Arrange - RFC 5321 limit: local-part 64 + @ + domain 255 = 320 max
    const local = 'a'.repeat(64);
    const domain = 'b'.repeat(255);
    const tooLong = `${local}@${domain}.com`; // 64 + 1 + 255 + 4 = 324 chars

    // Act
    const r = EmailAddress.parse(tooLong);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-address-too-long');
    }
  });
});
