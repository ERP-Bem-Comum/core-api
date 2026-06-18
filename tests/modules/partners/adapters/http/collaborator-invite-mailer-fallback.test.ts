/**
 * NOTIF-INVITE-FALLBACK-SYNC · W0 (RED) — paridade do fallback do convite (partners) com o reset.
 *
 * Bug (issue #136): sem NOTIFICATIONS_DATABASE_URL, com provider + remetente validos, o
 * buildPartnersInviteMailer caia em outbox InMemory (makeOutboxCollaboratorInviteMailer sobre
 * InMemoryEmailOutbox) — sem worker, o e-mail NUNCA sai. Estes testes provam que o convite de
 * colaborador passa a espelhar o reset: o fallback ENVIA pelo EmailSender, preservando a
 * precedencia PARTNERS_INVITE_FROM > resolveFrom('invite').
 *
 * Seam: buildPartnersInviteMailer aceita um EmailSender injetavel (opcional, default =
 * buildEmailSender(env)). No caminho buggy (outbox InMemory) o sender injetado NUNCA e chamado ->
 * sent.length === 0 -> RED.
 *
 * DEVE FALHAR em W0 (buildPartnersInviteMailer nao exportado / sem seam). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/primitives/result.ts';
import { buildPartnersInviteMailer } from '#src/modules/partners/adapters/http/composition.ts';
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

describe('buildPartnersInviteMailer (partners) — fallback sincrono (paridade com reset)', () => {
  it('CA2: sem NOTIFICATIONS_DATABASE_URL + provider/remetente validos -> ENVIA pelo EmailSender', async () => {
    const { sender, sent } = makeFakeSender();
    const env: Readonly<NodeJS.ProcessEnv> = {
      EMAIL_PROVIDER: 'memory',
      EMAIL_FROM_INVITE: 'no-reply@bemcomum.local',
    };
    const build = await buildPartnersInviteMailer(env, sender);

    const r = await build.mailer.sendInvite({
      email: 'colab@example.com',
      autocadastroUrl: 'https://app.local/collaborator/activate?token=xyz789',
      recipientName: 'Joao',
    });

    assert.equal(r.ok, true);
    assert.equal(sent.length, 1);
    const msg = sent[0];
    assert.ok(msg !== undefined);
    if (msg !== undefined) {
      assert.equal(String(msg.to[0]), 'colab@example.com');
      assert.ok(msg.textBody.includes('https://app.local/collaborator/activate?token=xyz789'));
    }
  });

  it('CA2 (precedencia): PARTNERS_INVITE_FROM sobrepoe resolveFrom(invite) no remetente enviado', async () => {
    const { sender, sent } = makeFakeSender();
    const env: Readonly<NodeJS.ProcessEnv> = {
      EMAIL_PROVIDER: 'memory',
      EMAIL_FROM_INVITE: 'generico@bemcomum.local',
      PARTNERS_INVITE_FROM: 'parceiros@bemcomum.local',
    };
    const build = await buildPartnersInviteMailer(env, sender);

    const r = await build.mailer.sendInvite({
      email: 'colab@example.com',
      autocadastroUrl: 'https://app.local/collaborator/activate?token=xyz789',
      recipientName: 'Joao',
    });

    assert.equal(r.ok, true);
    assert.equal(sent.length, 1);
    const msg = sent[0];
    assert.ok(msg !== undefined);
    if (msg !== undefined) {
      assert.equal(String(msg.from), 'parceiros@bemcomum.local');
    }
  });

  it('CA3 (paridade): provider invalido -> boot falha (throw)', async () => {
    await assert.rejects(
      () =>
        buildPartnersInviteMailer({ EMAIL_PROVIDER: 'nao-existe' } as Readonly<NodeJS.ProcessEnv>),
      /configura|provider/i,
    );
  });

  it('CA3 (paridade): sem remetente -> no-op SEGURO (nao envia, nao quebra)', async () => {
    const { sender, sent } = makeFakeSender();
    const build = await buildPartnersInviteMailer({ EMAIL_PROVIDER: 'memory' }, sender);

    const r = await build.mailer.sendInvite({
      email: 'colab@example.com',
      autocadastroUrl: 'https://app.local/collaborator/activate?token=xyz789',
      recipientName: 'Joao',
    });

    assert.equal(r.ok, true);
    assert.equal(sent.length, 0);
  });
});
