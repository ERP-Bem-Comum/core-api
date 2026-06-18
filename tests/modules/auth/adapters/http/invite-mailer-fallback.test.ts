/**
 * NOTIF-INVITE-FALLBACK-SYNC · W0 (RED) — paridade do fallback do convite (auth) com o reset.
 *
 * Bug (issue #136): sem NOTIFICATIONS_DATABASE_URL, com provider + remetente validos, o
 * buildInviteMailer caia em outbox InMemory (makeOutboxInviteMailer sobre InMemoryEmailOutbox) —
 * sem worker, o e-mail NUNCA sai. O buildResetMailer, no mesmo ponto, ja usa o EmailSender
 * SINCRONO (buildEmailSender + makeEmailPasswordResetMailer). Estes testes provam que o convite
 * passa a espelhar o reset: o fallback ENVIA pelo EmailSender, nao enfileira num outbox sem worker.
 *
 * Seam: buildInviteMailer aceita um EmailSender injetavel (opcional, default = buildEmailSender(env)).
 * O teste injeta um fake observavel e verifica getSent(). No caminho buggy (outbox InMemory) o
 * sender injetado NUNCA e chamado -> sent.length === 0 -> RED.
 *
 * DEVE FALHAR em W0 (buildInviteMailer nao exportado / sem seam de EmailSender). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { buildInviteMailer } from '#src/modules/auth/adapters/http/composition.ts';
import type { EmailMessage, EmailSender } from '#src/modules/notifications/public-api/index.ts';

const makeFakeSender = () => {
  const sent: EmailMessage[] = [];
  const sender: EmailSender = {
    send: async (message) => {
      await Promise.resolve();
      sent.push(message);
      return ok({ messageId: 'fake-id', acceptedAt: '2026-06-17T12:00:00.000Z' });
    },
  };
  return { sender, sent };
};

// Env com provider valido (memory) + remetente de convite, SEM NOTIFICATIONS_DATABASE_URL.
const fallbackEnv = (): Readonly<NodeJS.ProcessEnv> => ({
  EMAIL_PROVIDER: 'memory',
  EMAIL_FROM_INVITE: 'no-reply@bemcomum.local',
});

describe('buildInviteMailer (auth) — fallback sincrono (paridade com reset)', () => {
  it('CA1: sem NOTIFICATIONS_DATABASE_URL + provider/remetente validos -> ENVIA pelo EmailSender', async () => {
    const { sender, sent } = makeFakeSender();
    const build = await buildInviteMailer(fallbackEnv(), sender);

    const r = await build.mailer.sendInvite({
      email: 'user@example.com',
      activationUrl: 'https://app.local/activate?token=abc123',
      recipientName: 'Maria',
    });

    assert.equal(r.ok, true);
    // Prova que NAO caiu em outbox InMemory: o EmailSender sincrono foi efetivamente chamado.
    assert.equal(sent.length, 1);
    const msg = sent[0];
    assert.ok(msg !== undefined);
    if (msg !== undefined) {
      assert.equal(String(msg.to[0]), 'user@example.com');
      assert.ok(msg.textBody.includes('https://app.local/activate?token=abc123'));
    }
  });

  it('CA3 (paridade): provider invalido -> boot falha (throw), igual ao reset', async () => {
    await assert.rejects(
      () => buildInviteMailer({ EMAIL_PROVIDER: 'nao-existe' } as Readonly<NodeJS.ProcessEnv>),
      /provider de e-mail|configura/i,
    );
  });

  it('CA3 (paridade): sem remetente configurado -> no-op SEGURO (nao envia, nao quebra)', async () => {
    const { sender, sent } = makeFakeSender();
    const build = await buildInviteMailer({ EMAIL_PROVIDER: 'memory' }, sender);

    const r = await build.mailer.sendInvite({
      email: 'user@example.com',
      activationUrl: 'https://app.local/activate?token=abc123',
      recipientName: 'Maria',
    });

    assert.equal(r.ok, true);
    assert.equal(sent.length, 0);
  });
});
