/**
 * W0 (RED) - Tests para parseEmailConfig + resolveFrom (parser puro env -> EmailConfig).
 *
 * Ticket: NOTIF-EMAIL-DEPLOY-CONFIG. Materializa ADR-0010 (provider/remetente/sandbox por env).
 *
 * Cobre CA1-CA8, CA10 (resolucao de config + remetente):
 *   - CA1: EMAIL_PROVIDER=memory -> provider 'memory'
 *   - CA2: EMAIL_PROVIDER=smtp completo/incompleto -> ok/err
 *   - CA3: EMAIL_PROVIDER=resend com/sem RESEND_API_KEY -> ok/err
 *   - CA4: EMAIL_PROVIDER=foo -> err invalid-provider citando 'foo'
 *   - CA5: ausente + SMTP_* validos -> smtp; ausente sem SMTP_* -> memory
 *   - CA6: EMAIL_FROM global, sem override -> resolveFrom retorna o global
 *   - CA7: EMAIL_FROM_RESET sobrepoe; invite cai no global
 *   - CA8: so AUTH_RESET_FROM (alias legado) -> resolveFrom('reset') usa o alias
 *   - CA10: EMAIL_FROM malformado -> err
 *
 * Estes tests DEVEM FALHAR em W0 - email-config.ts ainda nao existe.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  parseEmailConfig,
  resolveFrom,
} from '#src/modules/notifications/adapters/email/email-config.ts';

const smtpEnv = (): NodeJS.ProcessEnv => ({
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'sekret',
});

describe('parseEmailConfig - provider', () => {
  it('CA1: EMAIL_PROVIDER=memory resolve provider memory', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory' });

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.provider, 'memory');
  });

  it('CA2: EMAIL_PROVIDER=smtp completo resolve provider smtp com config SMTP', () => {
    const r = parseEmailConfig({ ...smtpEnv(), EMAIL_PROVIDER: 'smtp' });

    assert.equal(r.ok, true);
    if (r.ok && r.value.provider === 'smtp') {
      assert.equal(r.value.smtp.host, 'smtp.example.com');
      assert.equal(r.value.smtp.port, 587);
    } else {
      assert.fail(`esperado provider smtp; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA2: EMAIL_PROVIDER=smtp incompleto retorna err (campo faltante)', () => {
    const env = smtpEnv();
    delete env['SMTP_HOST'];

    const r = parseEmailConfig({ ...env, EMAIL_PROVIDER: 'smtp' });

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error.tag, 'invalid-provider-config');
    }
  });

  it('CA3: EMAIL_PROVIDER=resend com RESEND_API_KEY resolve provider resend', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_123' });

    assert.equal(r.ok, true);
    if (r.ok && r.value.provider === 'resend') {
      assert.equal(r.value.resend.apiKey, 're_123');
    } else {
      assert.fail(`esperado provider resend; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA3: EMAIL_PROVIDER=resend sem RESEND_API_KEY retorna err', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'resend' });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error.tag, 'invalid-provider-config');
  });

  it('CA4: EMAIL_PROVIDER invalido retorna err invalid-provider citando o valor', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'foo' });

    assert.equal(r.ok, false);
    if (!r.ok && r.error.tag === 'invalid-provider') {
      assert.equal(r.error.raw, 'foo');
    } else {
      assert.fail(`esperado invalid-provider raw='foo'; obtido: ${JSON.stringify(r)}`);
    }
  });

  it('CA5: EMAIL_PROVIDER ausente + SMTP_* validos resolve smtp (compat)', () => {
    const r = parseEmailConfig(smtpEnv());

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.provider, 'smtp');
  });

  it('CA5: EMAIL_PROVIDER ausente sem SMTP_* resolve memory (compat)', () => {
    const r = parseEmailConfig({});

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.provider, 'memory');
  });
});

describe('parseEmailConfig - sandbox', () => {
  it('CA9: EMAIL_SANDBOX_TO valido fica disponivel na config', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory', EMAIL_SANDBOX_TO: 'qa@example.com' });

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.sandboxTo, 'qa@example.com');
  });

  it('CA9: sem EMAIL_SANDBOX_TO a config nao tem sandboxTo', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory' });

    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.sandboxTo, undefined);
  });

  it('CA10: EMAIL_SANDBOX_TO malformado retorna err', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory', EMAIL_SANDBOX_TO: 'nao-eh-email' });

    assert.equal(r.ok, false);
  });
});

describe('parseEmailConfig - from / CA10', () => {
  it('CA6: EMAIL_FROM global fica disponivel', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory', EMAIL_FROM: 'no-reply@example.com' });

    assert.equal(r.ok, true);
  });

  it('CA10: EMAIL_FROM malformado retorna err', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory', EMAIL_FROM: 'sem-arroba' });

    assert.equal(r.ok, false);
  });

  it('CA10: EMAIL_FROM_RESET malformado retorna err', () => {
    const r = parseEmailConfig({
      EMAIL_PROVIDER: 'memory',
      EMAIL_FROM: 'no-reply@example.com',
      EMAIL_FROM_RESET: 'invalido',
    });

    assert.equal(r.ok, false);
  });
});

describe('resolveFrom', () => {
  it('CA6: sem override usa EMAIL_FROM global', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory', EMAIL_FROM: 'global@example.com' });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('reset', r.value), 'global@example.com');
    assert.equal(resolveFrom('invite', r.value), 'global@example.com');
    assert.equal(resolveFrom('notification', r.value), 'global@example.com');
  });

  it('CA7: EMAIL_FROM_RESET sobrepoe para reset; invite cai no global', () => {
    const r = parseEmailConfig({
      EMAIL_PROVIDER: 'memory',
      EMAIL_FROM: 'global@example.com',
      EMAIL_FROM_RESET: 'reset@example.com',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('reset', r.value), 'reset@example.com');
    assert.equal(resolveFrom('invite', r.value), 'global@example.com');
  });

  it('CA7: EMAIL_FROM_INVITE e EMAIL_FROM_NOTIFICATION resolvem por tipo', () => {
    const r = parseEmailConfig({
      EMAIL_PROVIDER: 'memory',
      EMAIL_FROM: 'global@example.com',
      EMAIL_FROM_INVITE: 'invite@example.com',
      EMAIL_FROM_NOTIFICATION: 'notif@example.com',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('invite', r.value), 'invite@example.com');
    assert.equal(resolveFrom('notification', r.value), 'notif@example.com');
    assert.equal(resolveFrom('reset', r.value), 'global@example.com');
  });

  it('CA8: alias legado AUTH_RESET_FROM usado por resolveFrom(reset) quando sem EMAIL_FROM*', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory', AUTH_RESET_FROM: 'legacy@example.com' });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('reset', r.value), 'legacy@example.com');
  });

  it('CA8: alias legado AUTH_INVITE_FROM usado por resolveFrom(invite) quando sem EMAIL_FROM*', () => {
    const r = parseEmailConfig({
      EMAIL_PROVIDER: 'memory',
      AUTH_INVITE_FROM: 'legacy-invite@example.com',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('invite', r.value), 'legacy-invite@example.com');
  });

  it('CA8: novo EMAIL_FROM_RESET tem precedencia sobre o alias legado AUTH_RESET_FROM', () => {
    const r = parseEmailConfig({
      EMAIL_PROVIDER: 'memory',
      EMAIL_FROM_RESET: 'new@example.com',
      AUTH_RESET_FROM: 'legacy@example.com',
    });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('reset', r.value), 'new@example.com');
  });

  it('sem nenhum from configurado, resolveFrom retorna undefined (no-op seguro a montante)', () => {
    const r = parseEmailConfig({ EMAIL_PROVIDER: 'memory' });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    assert.equal(resolveFrom('reset', r.value), undefined);
  });
});
