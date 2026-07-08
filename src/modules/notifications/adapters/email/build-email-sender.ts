/**
 * buildEmailSender - fabrica unica de EmailSender resolvida por env (deploy).
 *
 * Ticket: NOTIF-EMAIL-DEPLOY-CONFIG. Materializa ADR-0010: "trocar provider = 1 env no deploy".
 *
 * Resolve o provider (smtp | resend | memory) via parseEmailConfig e, quando ha EMAIL_SANDBOX_TO,
 * envolve o sender no decorator withSandboxRedirect. Erro de config = Result err (boot falha,
 * nunca silencioso). Exposta na public-api do modulo notifications.
 *
 * ASCII puro.
 */

import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import { createInMemoryEmailSender } from './in-memory.ts';
import { createNodemailerEmailSender } from './nodemailer.ts';
import { createResendEmailSender } from './resend.ts';
import { parseEmailConfig, type EmailConfig, type EmailConfigError } from './email-config.ts';
import { withSandboxRedirect } from './sandbox-redirect.ts';
import { withRateLimit, rateLimitConfigFromEnv } from './rate-limit.ts';
import { err } from '../../../../shared/primitives/result.ts';

const createBaseSender = (config: EmailConfig): EmailSender => {
  switch (config.provider) {
    case 'memory':
      return createInMemoryEmailSender();
    case 'smtp':
      return createNodemailerEmailSender(config.smtp);
    case 'resend':
      return createResendEmailSender(config.resend);
    default: {
      const _exhaustive: never = config;
      return _exhaustive;
    }
  }
};

export const buildEmailSender = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<EmailSender, EmailConfigError> => {
  const config = parseEmailConfig(env);
  if (!config.ok) return config;

  const base = createBaseSender(config.value);
  const sandboxed =
    config.value.sandboxTo !== undefined ? withSandboxRedirect(base, config.value.sandboxTo) : base;

  // Rate-limit (#133) e o decorator MAIS EXTERNO: conta o destinatario REAL, antes de o sandbox
  // reescrever o `to`. Config presente-porem-invalida FALHA O BOOT (M3, fail-loud — nao desliga em silencio).
  const rl = rateLimitConfigFromEnv(env);
  if (rl.kind === 'invalid') return err({ tag: 'invalid-rate-limit', reason: rl.reason });
  const sender =
    rl.kind === 'on' ? withRateLimit(sandboxed, rl.policy, () => Date.now()) : sandboxed;

  return ok(sender);
};
