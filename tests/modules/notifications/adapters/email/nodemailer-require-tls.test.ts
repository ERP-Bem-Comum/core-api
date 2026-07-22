/**
 * W0 (RED) - NOTIF-SMTP-REQUIRETLS: wiring do requireTLS no transport.
 *
 * Ticket: NOTIF-SMTP-REQUIRETLS.
 *
 * Prova que createNodemailerEmailSender REPASSA config.requireTLS ao
 * nodemailer.createTransport (ambos os branches: pool e sem-pool).
 *
 * Tecnica: argument-captor via t.mock.method sobre nodemailer.createTransport.
 * NAO ha rede - createTransport apenas constroi o transporter (SMTPTransport /
 * SMTPPool nao conectam ate o primeiro send/verify), entao este teste roda no
 * `pnpm test` puro (fora do gate NOTIFICATIONS_INTEGRATION). t.mock auto-restaura
 * o metodo ao fim de cada teste.
 *
 * Estes tests DEVEM FALHAR em W0 - o baseOpts atual (nodemailer.ts:49-54) nao
 * inclui requireTLS, logo opts.requireTLS === undefined em runtime.
 *
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import nodemailer from 'nodemailer';

import { createNodemailerEmailSender } from '#src/modules/notifications/adapters/email/nodemailer.ts';
import type { SmtpConfig } from '#src/modules/notifications/adapters/email/nodemailer-config.ts';

const baseConfig = (overrides: Partial<SmtpConfig> = {}): SmtpConfig =>
  ({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    user: 'user@example.com',
    pass: 'sekret',
    pool: false,
    maxConnections: 1,
    requireTLS: true,
    ...overrides,
  }) as SmtpConfig;

interface Captor {
  mock: { calls: readonly { arguments: readonly unknown[] }[] };
}

const firstOpts = (captor: Captor): Record<string, unknown> | undefined =>
  captor.mock.calls[0]?.arguments[0] as Record<string, unknown> | undefined;

describe('createNodemailerEmailSender - requireTLS wiring (NOTIF-SMTP-REQUIRETLS)', () => {
  it('CA1: config.requireTLS=true com pool=false -> transport recebe requireTLS:true', (t) => {
    // Arrange
    const captor = t.mock.method(nodemailer, 'createTransport');

    // Act
    createNodemailerEmailSender(baseConfig({ pool: false, requireTLS: true }));

    // Assert
    const opts = firstOpts(captor);
    assert.ok(opts, 'nodemailer.createTransport deve ter sido chamado');
    assert.equal(opts?.['requireTLS'], true);
  });

  it('CA1: config.requireTLS=true com pool=true -> requireTLS:true tambem no branch de pool', (t) => {
    // Arrange
    const captor = t.mock.method(nodemailer, 'createTransport');

    // Act
    createNodemailerEmailSender(baseConfig({ pool: true, maxConnections: 5, requireTLS: true }));

    // Assert
    const opts = firstOpts(captor);
    assert.ok(opts, 'nodemailer.createTransport deve ter sido chamado');
    assert.equal(opts?.['requireTLS'], true, 'requireTLS deve estar presente no branch de pool');
    assert.equal(opts?.['pool'], true, 'branch de pool preservado');
  });

  it('CA2: config.requireTLS=false -> transport recebe requireTLS:false (opt-out repassado)', (t) => {
    // Arrange
    const captor = t.mock.method(nodemailer, 'createTransport');

    // Act
    createNodemailerEmailSender(baseConfig({ requireTLS: false }));

    // Assert
    const opts = firstOpts(captor);
    assert.ok(opts, 'nodemailer.createTransport deve ter sido chamado');
    assert.equal(opts?.['requireTLS'], false);
  });
});
