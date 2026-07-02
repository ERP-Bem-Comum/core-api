/**
 * parseSmtpConfig - parser puro de NodeJS.ProcessEnv para SmtpConfig.
 *
 * Ticket: CTR-EMAIL-ADAPTER-NODEMAILER (W1).
 *
 * Sem leitura de process.env interna - injection explicita. Permite testes
 * deterministicos via objeto literal.
 *
 * Env vars (ADR-0010):
 *   SMTP_HOST       required
 *   SMTP_PORT       required, int positivo
 *   SMTP_SECURE     required, 'true'|outro
 *   SMTP_USER       required
 *   SMTP_PASS       required
 *   SMTP_POOL       opcional, default true; 'false' desliga
 *   SMTP_MAX_CONNS  opcional, default 5; int >= 1
 *   SMTP_REQUIRE_TLS opcional, default fail-secure (!secure); so 'false' desativa
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

export type SmtpConfig = Readonly<{
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  pool: boolean;
  maxConnections: number;
  requireTLS: boolean;
}>;

export type SmtpConfigError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-port'; raw: string }>
  | Readonly<{ tag: 'invalid-max-connections'; raw: string }>;

const REQUIRED_FIELDS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_USER',
  'SMTP_PASS',
] as const;

const DEFAULT_POOL = true;
const DEFAULT_MAX_CONNECTIONS = 5;

export const parseSmtpConfig = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<SmtpConfig, SmtpConfigError> => {
  for (const field of REQUIRED_FIELDS) {
    const v = env[field];
    if (v === undefined || v === '') {
      return err({ tag: 'missing-env', field });
    }
  }

  const portRaw = env['SMTP_PORT'] ?? '';
  const port = Number.parseInt(portRaw, 10);
  if (!Number.isInteger(port) || port <= 0 || String(port) !== portRaw) {
    return err({ tag: 'invalid-port', raw: portRaw });
  }

  let maxConnections = DEFAULT_MAX_CONNECTIONS;
  const maxConnsRaw = env['SMTP_MAX_CONNS'];
  if (maxConnsRaw !== undefined && maxConnsRaw !== '') {
    const parsed = Number.parseInt(maxConnsRaw, 10);
    if (!Number.isInteger(parsed) || parsed < 1 || String(parsed) !== maxConnsRaw) {
      return err({ tag: 'invalid-max-connections', raw: maxConnsRaw });
    }
    maxConnections = parsed;
  }

  const pool = env['SMTP_POOL'] === 'false' ? false : DEFAULT_POOL;

  const secure = env['SMTP_SECURE'] === 'true';
  // Fail-secure: so a string exata 'false' desativa; qualquer typo mantem TLS exigido.
  const requireTLS = env['SMTP_REQUIRE_TLS'] === 'false' ? false : !secure;

  return ok({
    host: env['SMTP_HOST'] ?? '',
    port,
    secure,
    user: env['SMTP_USER'] ?? '',
    pass: env['SMTP_PASS'] ?? '',
    pool,
    maxConnections,
    requireTLS,
  });
};
