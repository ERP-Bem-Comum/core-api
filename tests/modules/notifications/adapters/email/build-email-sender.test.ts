/**
 * W0 (RED) - Tests para buildEmailSender (fabrica unica provider + sandbox).
 *
 * Ticket: NOTIF-EMAIL-DEPLOY-CONFIG. Exposta na public-api. Materializa ADR-0010
 * ("trocar provider = 1 env no deploy").
 *
 * Cobre CA1-CA5 + CA9 (integracao da fabrica):
 *   - CA1: memory -> EmailSender que nao envia externamente (observavel: InMemory entrega ok)
 *   - CA2: smtp completo -> EmailSender (Nodemailer); incompleto -> err
 *   - CA3: resend com key -> EmailSender; sem key -> err
 *   - CA4: provider invalido -> err
 *   - CA5: ausente compat
 *   - CA9: EMAIL_SANDBOX_TO -> sender decorado redireciona; sem -> destinatario original
 *
 * Estes tests DEVEM FALHAR em W0 - build-email-sender.ts e a re-exportacao na public-api ainda nao existem.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildEmailSender } from '#src/modules/notifications/public-api/index.ts';
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

const smtpEnv = (): NodeJS.ProcessEnv => ({
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_SECURE: 'false',
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'sekret',
});

describe('buildEmailSender - provider', () => {
  it('CA1: provider=memory retorna um EmailSender que entrega (nao envia externamente)', async () => {
    const r = buildEmailSender({ EMAIL_PROVIDER: 'memory' });

    assert.equal(r.ok, true);
    if (!r.ok) return;
    const sent = await r.value.send({
      from: addr('no-reply@example.com'),
      to: [addr('user@x.com')],
      subject: subj('Oi'),
      textBody: 'corpo',
    });
    assert.equal(sent.ok, true);
  });

  it('CA2: provider=smtp completo retorna ok (EmailSender)', () => {
    const r = buildEmailSender({ ...smtpEnv(), EMAIL_PROVIDER: 'smtp' });
    assert.equal(r.ok, true);
  });

  it('CA2: provider=smtp incompleto retorna err', () => {
    const env = smtpEnv();
    delete env['SMTP_PASS'];
    const r = buildEmailSender({ ...env, EMAIL_PROVIDER: 'smtp' });
    assert.equal(r.ok, false);
  });

  it('CA3: provider=resend com RESEND_API_KEY retorna ok', () => {
    const r = buildEmailSender({ EMAIL_PROVIDER: 'resend', RESEND_API_KEY: 're_123' });
    assert.equal(r.ok, true);
  });

  it('CA3: provider=resend sem key retorna err', () => {
    const r = buildEmailSender({ EMAIL_PROVIDER: 'resend' });
    assert.equal(r.ok, false);
  });

  it('CA4: provider invalido retorna err', () => {
    const r = buildEmailSender({ EMAIL_PROVIDER: 'foo' });
    assert.equal(r.ok, false);
  });

  it('CA5: ausente + SMTP_* validos retorna ok (smtp por compat)', () => {
    const r = buildEmailSender(smtpEnv());
    assert.equal(r.ok, true);
  });

  it('CA5: ausente sem SMTP_* retorna ok (memory por compat)', () => {
    const r = buildEmailSender({});
    assert.equal(r.ok, true);
  });
});

describe('buildEmailSender - sandbox (CA9)', () => {
  it('CA9: com EMAIL_SANDBOX_TO o sender redireciona to para a caixa de sandbox', async () => {
    // Arrange: memory para observar a mensagem entregue ao sender subjacente.
    const r = buildEmailSender({ EMAIL_PROVIDER: 'memory', EMAIL_SANDBOX_TO: 'qa@example.com' });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    // Act
    const sent = await r.value.send({
      from: addr('no-reply@example.com'),
      to: [addr('user@destino.com')],
      subject: subj('Oi'),
      textBody: 'corpo',
    });

    // Assert: nao ha como observar o InMemory interno aqui; o teste unitario do decorator
    // (sandbox-redirect.test.ts) cobre a reescrita. Aqui validamos que o envio segue ok.
    assert.equal(sent.ok, true);
  });

  it('CA9: sem EMAIL_SANDBOX_TO o sender entrega ao destinatario original (ok)', async () => {
    const r = buildEmailSender({ EMAIL_PROVIDER: 'memory' });
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const sent = await r.value.send({
      from: addr('no-reply@example.com'),
      to: [addr('user@destino.com')],
      subject: subj('Oi'),
      textBody: 'corpo',
    });
    assert.equal(sent.ok, true);
  });

  it('CA10: EMAIL_FROM malformado faz a fabrica falhar (boot falha)', () => {
    const r = buildEmailSender({ EMAIL_PROVIDER: 'memory', EMAIL_FROM: 'sem-arroba' });
    assert.equal(r.ok, false);
  });
});
