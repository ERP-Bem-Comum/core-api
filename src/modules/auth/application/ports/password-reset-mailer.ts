/**
 * Port PasswordResetMailer (modulo auth, BE-REC-003) - envia o link de reset ao usuario.
 *
 * Abstrai o detalhe de e-mail (template, EmailSender do modulo notifications) do use case. O `resetUrl`
 * e montado pelo use case a partir de origem CONFIAVEL (config do servidor, nunca header Host). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';

export type PasswordResetMailerError = 'reset-mail-failed';

export type PasswordResetMailer = Readonly<{
  sendResetLink: (
    input: Readonly<{ email: string; resetUrl: string }>,
  ) => Promise<Result<void, PasswordResetMailerError>>;
}>;
