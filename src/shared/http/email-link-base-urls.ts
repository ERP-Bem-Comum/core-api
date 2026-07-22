/**
 * Base URLs dos links de e-mail transacional (reset / ativacao / autocadastro).
 *
 * Issues #331/#332: base ausente vazava o default localhost das composicoes para
 * producao, e base sem protocolo (ex.: "erp.abemcomum.org") virava link relativo
 * que o SPA descarta. Regra: presente -> URL absoluta http(s); em producao
 * (NODE_ENV=production) as tres sao obrigatorias — boot falha em vez de enviar
 * e-mail com link quebrado.
 */

import { err, ok, type Result } from '#src/shared/primitives/result.ts';

const FIELDS = [
  ['resetBaseUrl', 'AUTH_RESET_BASE_URL'],
  ['activationBaseUrl', 'AUTH_ACTIVATION_BASE_URL'],
  ['selfRegistrationBaseUrl', 'PARTNERS_SELF_REGISTRATION_BASE_URL'],
] as const;

type Field = (typeof FIELDS)[number][0];

export type EmailLinkBaseUrls = Readonly<Partial<Record<Field, string>>>;

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

export const readEmailLinkBaseUrls = (
  env: Readonly<Record<string, string | undefined>>,
): Result<EmailLinkBaseUrls, readonly string[]> => {
  const isProduction = env['NODE_ENV'] === 'production';
  const errors: string[] = [];
  const urls: Partial<Record<Field, string>> = {};
  for (const [field, name] of FIELDS) {
    const value = env[name];
    if (value === undefined || value === '') {
      if (isProduction) {
        errors.push(`${name} nao configurada (obrigatoria em producao para o link de e-mail)`);
      }
      continue;
    }
    if (!isAbsoluteHttpUrl(value)) {
      errors.push(`${name} deve ser URL absoluta http(s), valor atual: "${value}"`);
      continue;
    }
    urls[field] = value;
  }
  return errors.length > 0 ? err(errors) : ok(urls);
};
