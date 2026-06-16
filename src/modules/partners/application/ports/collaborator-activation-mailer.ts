/**
 * Port `CollaboratorActivationMailer` (#43) — envia o link de autocadastro ao colaborador.
 *
 * Espelha ADR-0010 (Email Port/Adapter) e o `PasswordResetMailer` do auth (DUPLICADO — ADR-0006).
 * Abstrai o detalhe de e-mail (template, EmailSender do módulo notifications) do use case. O
 * `activationUrl` é montado pelo use case a partir de origem CONFIÁVEL (config do servidor, nunca
 * header Host). ASCII puro.
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type CollaboratorActivationMailerError = 'activation-mail-failed';

export type CollaboratorActivationMailer = Readonly<{
  sendActivationLink: (
    input: Readonly<{ email: string; activationUrl: string; recipientName: string }>,
  ) => Promise<Result<void, CollaboratorActivationMailerError>>;
}>;
