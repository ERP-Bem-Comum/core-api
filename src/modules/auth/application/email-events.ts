// Construtores dos eventos de dominio de e-mail do auth (AUTH-DOMAIN-OUTBOX / ADR-0047).
//
// PasswordResetRequested / UserInvited sao eventos de e-mail transacional: o consumidor (fatia
// 02, notifications) os mapeia em template + envio. Payload AUTOCONTIDO com o necessario para o
// e-mail (destinatario, link/token de uso unico, nome). EN passado; aggregateType 'User';
// eventId UUID v4 novo; payload JSON.stringify (sem JSON nativo — ADR-0020).
//
// SEGURANCA (ADR-0047 §5): o payload carrega link/token (sensivel). Outbox interno (nao cruza
// public-api publica — ADR-0006), nao logado. Por isso este modulo monta a string e nunca a loga.

import { newUuid } from '#src/shared/utils/id.ts';
import type { OutboxMessage } from './ports/outbox.ts';

/** Payload de PasswordResetRequested (reset de senha). */
type PasswordResetRequestedPayload = Readonly<{
  email: string;
  resetUrl: string;
  occurredAt: string;
}>;

/** Payload de UserInvited (convite de ativacao / primeiro acesso). */
type UserInvitedPayload = Readonly<{
  email: string;
  activationUrl: string;
  recipientName: string;
  occurredAt: string;
}>;

export const passwordResetRequestedMessage = (
  input: Readonly<{
    userId: string;
    email: string;
    resetUrl: string;
    occurredAt: Date;
  }>,
): OutboxMessage => {
  const payload: PasswordResetRequestedPayload = {
    email: input.email,
    resetUrl: input.resetUrl,
    occurredAt: input.occurredAt.toISOString(),
  };
  return {
    eventId: newUuid(),
    aggregateId: input.userId,
    aggregateType: 'User',
    eventType: 'PasswordResetRequested',
    occurredAt: input.occurredAt,
    payload: JSON.stringify(payload),
  };
};

export const userInvitedMessage = (
  input: Readonly<{
    userId: string;
    email: string;
    activationUrl: string;
    recipientName: string;
    occurredAt: Date;
  }>,
): OutboxMessage => {
  const payload: UserInvitedPayload = {
    email: input.email,
    activationUrl: input.activationUrl,
    recipientName: input.recipientName,
    occurredAt: input.occurredAt.toISOString(),
  };
  return {
    eventId: newUuid(),
    aggregateId: input.userId,
    aggregateType: 'User',
    eventType: 'UserInvited',
    occurredAt: input.occurredAt,
    payload: JSON.stringify(payload),
  };
};
