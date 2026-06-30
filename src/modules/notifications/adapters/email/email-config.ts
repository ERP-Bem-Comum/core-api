/**
 * parseEmailConfig + resolveFrom - composicao de e-mail 100% configuravel por env (deploy).
 *
 * Ticket: NOTIF-EMAIL-DEPLOY-CONFIG. Materializa ADR-0010 (provider/remetente/sandbox por env).
 *
 * Parser puro: sem leitura de process.env interna - injection explicita. Molde de
 * parseSmtpConfig/parseResendConfig (retorna Result; testavel por objeto literal).
 *
 * Eixos (ADR-0010):
 *   EMAIL_PROVIDER          smtp | resend | memory. Ausente = compat: SMTP_* validos -> smtp; senao memory.
 *   EMAIL_FROM              remetente global (ex.: "Bem Comum <no-reply@dominio>").
 *   EMAIL_FROM_RESET        remetente do fluxo reset (sobrepoe o global).
 *   EMAIL_FROM_INVITE       remetente do fluxo invite.
 *   EMAIL_FROM_NOTIFICATION remetente de notificacoes.
 *   AUTH_RESET_FROM         alias legado (deprecado) de EMAIL_FROM_RESET.
 *   AUTH_INVITE_FROM        alias legado (deprecado) de EMAIL_FROM_INVITE.
 *   EMAIL_SANDBOX_TO        caixa de redirecionamento em nao-prod (decorator withSandboxRedirect).
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import {
  parse as parseEmailAddress,
  type EmailAddress,
  type EmailAddressError,
} from '../../domain/email/address.ts';
import { parseSmtpConfig, type SmtpConfig, type SmtpConfigError } from './nodemailer-config.ts';
import { parseResendConfig, type ResendConfig, type ResendConfigError } from './resend-config.ts';

export type EmailProvider = 'smtp' | 'resend' | 'memory';

export type EmailFromKind = 'reset' | 'invite' | 'notification';

type FromMap = Readonly<{
  global?: EmailAddress;
  reset?: EmailAddress;
  invite?: EmailAddress;
  notification?: EmailAddress;
}>;

export type EmailConfig = (
  | Readonly<{ provider: 'memory' }>
  | Readonly<{ provider: 'smtp'; smtp: SmtpConfig }>
  | Readonly<{ provider: 'resend'; resend: ResendConfig }>
) &
  Readonly<{
    from: FromMap;
    sandboxTo?: EmailAddress;
  }>;

export type EmailConfigError =
  | Readonly<{ tag: 'invalid-provider'; raw: string }>
  | Readonly<{
      tag: 'invalid-provider-config';
      provider: EmailProvider;
      reason: SmtpConfigError | ResendConfigError;
    }>
  | Readonly<{ tag: 'invalid-from'; field: string; reason: EmailAddressError }>;

const PROVIDERS: readonly EmailProvider[] = ['smtp', 'resend', 'memory'];

const isProvider = (raw: string): raw is EmailProvider =>
  (PROVIDERS as readonly string[]).includes(raw);

const present = (v: string | undefined): v is string => v !== undefined && v.length > 0;

// Compat: provider ausente resolve smtp quando SMTP_* validos, senao memory.
const resolveProviderName = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<EmailProvider, EmailConfigError> => {
  const raw = env['EMAIL_PROVIDER'];
  if (raw === undefined || raw === '') {
    return ok(parseSmtpConfig(env).ok ? 'smtp' : 'memory');
  }
  if (!isProvider(raw)) return err({ tag: 'invalid-provider', raw });
  return ok(raw);
};

// Parseia um remetente opcional (vazio -> undefined; presente e malformado -> err).
const parseOptionalFrom = (
  field: string,
  raw: string | undefined,
): Result<EmailAddress | undefined, EmailConfigError> => {
  if (!present(raw)) return ok(undefined);
  const parsed = parseEmailAddress(raw);
  if (!parsed.ok) return err({ tag: 'invalid-from', field, reason: parsed.error });
  return ok(parsed.value);
};

export const parseEmailConfig = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<EmailConfig, EmailConfigError> => {
  const providerName = resolveProviderName(env);
  if (!providerName.ok) return providerName;

  // Remetentes: global + por tipo (novos) com fallback ao alias legado.
  const globalFrom = parseOptionalFrom('EMAIL_FROM', env['EMAIL_FROM']);
  if (!globalFrom.ok) return globalFrom;

  const resetFrom = parseOptionalFrom(
    'EMAIL_FROM_RESET',
    env['EMAIL_FROM_RESET'] ?? env['AUTH_RESET_FROM'],
  );
  if (!resetFrom.ok) return resetFrom;

  const inviteFrom = parseOptionalFrom(
    'EMAIL_FROM_INVITE',
    env['EMAIL_FROM_INVITE'] ?? env['AUTH_INVITE_FROM'],
  );
  if (!inviteFrom.ok) return inviteFrom;

  const notificationFrom = parseOptionalFrom(
    'EMAIL_FROM_NOTIFICATION',
    env['EMAIL_FROM_NOTIFICATION'],
  );
  if (!notificationFrom.ok) return notificationFrom;

  const sandboxTo = parseOptionalFrom('EMAIL_SANDBOX_TO', env['EMAIL_SANDBOX_TO']);
  if (!sandboxTo.ok) return sandboxTo;

  const from: FromMap = {
    ...(globalFrom.value !== undefined ? { global: globalFrom.value } : {}),
    ...(resetFrom.value !== undefined ? { reset: resetFrom.value } : {}),
    ...(inviteFrom.value !== undefined ? { invite: inviteFrom.value } : {}),
    ...(notificationFrom.value !== undefined ? { notification: notificationFrom.value } : {}),
  };

  const base = {
    from,
    ...(sandboxTo.value !== undefined ? { sandboxTo: sandboxTo.value } : {}),
  };

  switch (providerName.value) {
    case 'memory':
      return ok({ provider: 'memory', ...base });
    case 'smtp': {
      const smtp = parseSmtpConfig(env);
      if (!smtp.ok) {
        return err({ tag: 'invalid-provider-config', provider: 'smtp', reason: smtp.error });
      }
      return ok({ provider: 'smtp', smtp: smtp.value, ...base });
    }
    case 'resend': {
      const resend = parseResendConfig(env);
      if (!resend.ok) {
        return err({ tag: 'invalid-provider-config', provider: 'resend', reason: resend.error });
      }
      return ok({ provider: 'resend', resend: resend.value, ...base });
    }
    default: {
      const _exhaustive: never = providerName.value;
      return _exhaustive;
    }
  }
};

// Resolve o remetente do fluxo: por-tipo > global. undefined quando nada configurado
// (a montante o call-site mantem o no-op SEGURO).
export const resolveFrom = (kind: EmailFromKind, config: EmailConfig): EmailAddress | undefined =>
  config.from[kind] ?? config.from.global;
