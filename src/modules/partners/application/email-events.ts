// Construtores dos eventos de dominio de e-mail do partners (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047).
//
// CollaboratorInvited e um evento de e-mail transacional: o consumidor (email-dispatch, notifications)
// o mapeia em template de autocadastro + envio. Payload AUTOCONTIDO com o necessario para o e-mail
// (destinatario, link de autocadastro com token de uso unico, nome). EN passado; aggregateType
// 'Collaborator'; eventId UUID v4 novo; payload JSON.stringify (sem JSON nativo — ADR-0020).
//
// SEGURANCA (ADR-0047 §5): o payload carrega o link/token (sensivel). Outbox interno (nao cruza
// public-api publica — ADR-0006), nao logado. Por isso este modulo monta a string e nunca a loga.

import { newUuid } from '#src/shared/utils/id.ts';
import type { OutboxMessage } from './ports/email-outbox.ts';

/** Payload de CollaboratorInvited (convite de autocadastro de colaborador). */
type CollaboratorInvitedPayload = Readonly<{
  email: string;
  autocadastroUrl: string;
  recipientName: string;
  occurredAt: string;
}>;

export const collaboratorInvitedMessage = (
  input: Readonly<{
    collaboratorId: string;
    email: string;
    autocadastroUrl: string;
    recipientName: string;
    occurredAt: Date;
  }>,
): OutboxMessage => {
  const payload: CollaboratorInvitedPayload = {
    email: input.email,
    autocadastroUrl: input.autocadastroUrl,
    recipientName: input.recipientName,
    occurredAt: input.occurredAt.toISOString(),
  };
  return {
    eventId: newUuid(),
    aggregateId: input.collaboratorId,
    aggregateType: 'Collaborator',
    eventType: 'CollaboratorInvited',
    occurredAt: input.occurredAt,
    payload: JSON.stringify(payload),
  };
};
