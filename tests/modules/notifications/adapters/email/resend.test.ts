/**
 * W0 (RED) - Tests para mapResendError (traducao pura erro Resend -> EmailError).
 *
 * Ticket: CTR-EMAIL-ADAPTER-RESEND.
 *
 * Resend SDK NAO lanca em erro de API: retorna { data, error }. O adapter inspeciona
 * result.error (rejeicao estruturada { message, name }) e converte via mapResendError.
 *
 * Cobre CA-T3..T4:
 *   - T3: erro de destinatario invalido -> tag invalid-recipient
 *   - T4: rejeicao generica do provider (validation/auth/rate-limit) -> tag smtp-rejected
 *
 * Estes tests DEVEM FALHAR em W0 - resend.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { mapResendError } from '#src/modules/notifications/adapters/email/resend.ts';

describe('mapResendError', () => {
  it('CA-T3: erro de destinatario invalido vira invalid-recipient', () => {
    // Arrange
    const error = {
      name: 'validation_error',
      message: 'Invalid `to` field. The recipient address is malformed.',
    };

    // Act
    const mapped = mapResendError(error);

    // Assert
    assert.equal(mapped.tag, 'invalid-recipient');
    assert.equal(mapped.reason, error.message);
  });

  it('CA-T4: rejeicao generica do provider vira smtp-rejected', () => {
    // Arrange
    const error = {
      name: 'rate_limit_exceeded',
      message: 'Too many requests. Please slow down.',
    };

    // Act
    const mapped = mapResendError(error);

    // Assert
    assert.equal(mapped.tag, 'smtp-rejected');
    assert.equal(mapped.reason, error.message);
  });

  it('CA-T4b: auth invalida (api key) vira smtp-rejected', () => {
    // Arrange
    const error = {
      name: 'invalid_api_key',
      message: 'API key is invalid.',
    };

    // Act
    const mapped = mapResendError(error);

    // Assert
    assert.equal(mapped.tag, 'smtp-rejected');
  });
});
