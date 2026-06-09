/**
 * parseResendConfig - parser puro de NodeJS.ProcessEnv para ResendConfig.
 *
 * Ticket: CTR-EMAIL-ADAPTER-RESEND (W1).
 *
 * Sem leitura de process.env interna - injection explicita. Permite testes
 * deterministicos via objeto literal. Espelha parseSmtpConfig.
 *
 * Env vars:
 *   RESEND_API_KEY  required, non-empty
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

export type ResendConfig = Readonly<{ apiKey: string }>;

export type ResendConfigError = Readonly<{ tag: 'missing-env'; field: string }>;

export const parseResendConfig = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<ResendConfig, ResendConfigError> => {
  const apiKey = env['RESEND_API_KEY'];
  if (apiKey === undefined || apiKey === '') {
    return err({ tag: 'missing-env', field: 'RESEND_API_KEY' });
  }
  return ok({ apiKey });
};
