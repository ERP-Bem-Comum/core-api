/**
 * W0 (RED) - Tests para parseResendConfig (parser puro env -> ResendConfig).
 *
 * Ticket: CTR-EMAIL-ADAPTER-RESEND.
 *
 * Cobre CA-T1..T2:
 *   - T1: env valido (RESEND_API_KEY presente) retorna ok com apiKey
 *   - T2: RESEND_API_KEY ausente retorna err missing-env field RESEND_API_KEY
 *
 * Estes tests DEVEM FALHAR em W0 - resend-config.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { parseResendConfig } from '#src/modules/notifications/adapters/email/resend-config.ts';

const baseEnv = (): NodeJS.ProcessEnv => ({
  RESEND_API_KEY: 're_123456789',
});

describe('parseResendConfig', () => {
  it('CA-T1: env valido retorna ok com apiKey', () => {
    // Act
    const r = parseResendConfig(baseEnv());

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.apiKey, 're_123456789');
    }
  });

  it('CA-T2: RESEND_API_KEY ausente retorna err missing-env', () => {
    // Arrange
    const env = baseEnv();
    delete env['RESEND_API_KEY'];

    // Act
    const r = parseResendConfig(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'RESEND_API_KEY');
    } else {
      assert.fail(`esperado missing-env RESEND_API_KEY; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA-T2b: RESEND_API_KEY vazio retorna err missing-env', () => {
    // Arrange
    const env = baseEnv();
    env['RESEND_API_KEY'] = '';

    // Act
    const r = parseResendConfig(env);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'missing-env') {
      assert.equal(r.error.field, 'RESEND_API_KEY');
    } else {
      assert.fail(`esperado missing-env RESEND_API_KEY; obtido: ${JSON.stringify(r)}`);
    }
  });
});
