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
import { isProductionEnv } from '#src/shared/runtime/node-env.ts';

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
  const isProduction = isProductionEnv(env);
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

/** Links resolvidos que o boot injeta nas composições (auth: reset/ativação; partners: autocadastro). */
export type ResolvedEmailLinkUrls = Readonly<{
  resetBaseUrl?: string;
  activationBaseUrl?: string;
  autocadastroBaseUrl?: string;
}>;

/** Paths fixos das telas do front (rotas na raiz do web-app) — o convite deriva a origem do reset. */
const ACTIVATION_PATH = '/activate';
const AUTOCADASTRO_PATH = '/autocadastro';

/**
 * #739: resolve os três links a partir das bases lidas do ambiente. Quando a base própria de
 * **ativação** ou **autocadastro** não vem, deriva da ORIGEM do link de **reset** — o e-mail de
 * recuperação de senha é a fonte confiável do domínio do front no ambiente (se ele funciona, a
 * `AUTH_RESET_BASE_URL` está setada certo). Sem isto, ativação/autocadastro caíam nos defaults
 * `localhost` das composições e o link do e-mail não abria a tela. A base própria de cada um segue
 * valendo como override. `resetBaseUrl` já é URL absoluta (validada em `readEmailLinkBaseUrls`).
 */
export const resolveEmailLinkUrls = (base: EmailLinkBaseUrls): ResolvedEmailLinkUrls => {
  const origin = base.resetBaseUrl !== undefined ? new URL(base.resetBaseUrl).origin : undefined;
  const activation =
    base.activationBaseUrl ?? (origin !== undefined ? `${origin}${ACTIVATION_PATH}` : undefined);
  const autocadastro =
    base.selfRegistrationBaseUrl ??
    (origin !== undefined ? `${origin}${AUTOCADASTRO_PATH}` : undefined);
  return {
    ...(base.resetBaseUrl !== undefined ? { resetBaseUrl: base.resetBaseUrl } : {}),
    ...(activation !== undefined ? { activationBaseUrl: activation } : {}),
    ...(autocadastro !== undefined ? { autocadastroBaseUrl: autocadastro } : {}),
  };
};
