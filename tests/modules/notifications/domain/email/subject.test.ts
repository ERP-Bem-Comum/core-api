/**
 * W0 (RED) - Tests para EmailSubject (branded type + smart constructor).
 *
 * Ticket: CTR-EMAIL-PORT.
 *
 * Cobre CA-T4..T6:
 *   - T4: parse de subject valido retorna ok
 *   - T5: parse de string vazia retorna err('empty-subject')
 *   - T6: parse de string > 998 chars (RFC 5322 §2.1.1) retorna err('subject-too-long')
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as EmailSubject from '#src/modules/notifications/domain/email/subject.ts';

describe('EmailSubject.parse', () => {
  it('CA-T4: subject valido retorna ok', () => {
    // Act
    const r = EmailSubject.parse('Hello world');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'Hello world');
    }
  });

  it('CA-T5: string vazia retorna err empty-subject', () => {
    // Act
    const r = EmailSubject.parse('');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'empty-subject');
    }
  });

  it('CA-T6: string > 998 chars retorna err subject-too-long', () => {
    // Arrange - RFC 5322 §2.1.1: line length max 998 (excluding CRLF)
    const tooLong = 'x'.repeat(999);

    // Act
    const r = EmailSubject.parse(tooLong);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'subject-too-long');
    }
  });
});
