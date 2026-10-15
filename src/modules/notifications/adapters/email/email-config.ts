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
 *   EMAIL_FROM_ALLOWED_DOMAINS  CSV de dominios permitidos no remetente (guarda-corpo).
 *                               Presente -> todo remetente resolvivel (global + por fluxo +
 *                               aliases legados quando usados) deve ter dominio na lista, senao
 *                               config invalida (fail-fast de boot). Ausente -> sem verificacao.
 *                               Comparacao pelo dominio apos o @, case-insensitive.
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { echoEnvValue } from '../../../../shared/runtime/env-echo.ts';
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
  | Readonly<{ tag: 'invalid-from'; field: string; reason: EmailAddressError }>
  | Readonly<{ tag: 'from-domain-not-allowed'; field: string; domain: string }>
  // rate-limit (#133 M3): env presente porem malformado — boot falha alto (fail-loud, nao desliga em silencio).
  | Readonly<{ tag: 'invalid-rate-limit'; reason: string }>;

/**
 * Mensagem de boot que NOMEIA a variável culpada.
 *
 * @remarks
 * Existe porque quem formatava o erro imprimia só o `tag`: `config de e-mail inválida
 * (invalid-provider-config)`. O `reason` — que carrega o `field` — era descartado, e o operador
 * recebia um exit 78 sem saber qual variável preencher. Sob o overmind o estrago cresce: o
 * `worker-email` morre e leva os outros quatro processos, então o terminal fica cheio de
 * `Interrupting...` e nenhuma pista. Medido em dois boots seguidos, que só se resolveram com uma
 * sonda que chamava esta mesma função.
 *
 * O [ADR-0068](../../../../../handbook/architecture/adr/0068-env-fail-fast-every-environment.md)
 * é explícito sobre o que justifica o fail-fast: *"o modo de falha barato — o processo não sobe **e
 * diz qual campo falta** — é o único que chega a quem tem a mão no problema"*. Sem o nome do campo,
 * só a primeira metade era cumprida.
 *
 * ⚠️ Segurança, pela mesma régua de `describeVanS3ConfigError`: das variantes abaixo, só
 * `invalid-port` e `invalid-max-connections` carregam `raw`, e nenhuma delas vem de credencial —
 * `SMTP_USER` e `SMTP_PASS` falham como `missing-env`, que traz apenas o NOME (CWE-532). O `raw`
 * que é ecoado passa por `echoEnvValue`, contra forja de linha no stderr (CWE-117). Variante nova
 * que devolva `raw` de campo sensível precisa de guarda própria.
 */
export const describeEmailConfigError = (error: EmailConfigError): string => {
  switch (error.tag) {
    case 'invalid-provider':
      // Os aceitos são escritos aqui, e não derivados de `PROVIDERS`, porque a constante é
      // declarada adiante no arquivo — e trazê-la para cima só por causa desta mensagem moveria
      // uma declaração de domínio para servir um formatador.
      return `EMAIL_PROVIDER invalido "${echoEnvValue(error.raw)}" — aceitos: smtp, resend, memory`;
    case 'invalid-provider-config': {
      const r = error.reason;
      const detail =
        r.tag === 'missing-env'
          ? `${r.field} ausente ou VAZIA (string vazia conta como ausente)`
          : r.tag === 'invalid-port'
            ? `SMTP_PORT invalida "${echoEnvValue(r.raw)}"`
            : `SMTP_MAX_CONNS invalida "${echoEnvValue(r.raw)}"`;
      return `provider "${error.provider}" selecionado e sua config nao resolve: ${detail}`;
    }
    case 'invalid-from':
      return `${error.field} nao e endereco valido (${error.reason})`;
    case 'from-domain-not-allowed':
      return `${error.field} usa dominio "${echoEnvValue(error.domain)}", fora de EMAIL_FROM_ALLOWED_DOMAINS`;
    case 'invalid-rate-limit':
      return `rate limit de e-mail mal configurado: ${error.reason}`;
    default: {
      const _exhaustive: never = error;
      return _exhaustive;
    }
  }
};

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

// Extrai o endereco interno de um remetente com display name ("Nome <local@dominio>").
// Sem display name, devolve o proprio valor (comportamento atual preservado). O VO
// EmailAddress (address.ts) e' usado por outros fluxos (destinatarios) e nao suporta a
// forma com nome; a extracao vive aqui para nao alargar o VO (evita scope-creep).
const DISPLAY_NAME_RE = /^[^<>]*<([^<>]+)>$/;
const extractAddress = (raw: string): string => {
  const inner = DISPLAY_NAME_RE.exec(raw.trim())?.[1];
  return inner !== undefined ? inner.trim() : raw;
};

// Dominio (apos o @, lower-case) de um endereco ja validado pelo EMAIL_REGEX (um unico @).
const domainOf = (address: string): string =>
  address.slice(address.lastIndexOf('@') + 1).toLowerCase();

// CSV -> dominios normalizados (trim, lower-case, sem vazios). Ausente/vazio -> [].
const parseAllowedDomains = (raw: string | undefined): readonly string[] => {
  if (raw === undefined) return [];
  return raw
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
};

// Parseia um remetente opcional (vazio -> undefined; presente e malformado -> err).
// Suporta display name: valida o endereco interno mas preserva o valor original (o
// call-site usa o resultado direto como header From, ver worker email-dispatch). Quando
// a allowlist esta presente, exige que o dominio do endereco interno pertenca a ela.
const parseFromField = (
  field: string,
  raw: string | undefined,
  allowedDomains: readonly string[],
): Result<EmailAddress | undefined, EmailConfigError> => {
  if (!present(raw)) return ok(undefined);
  const address = extractAddress(raw);
  const parsed = parseEmailAddress(address);
  if (!parsed.ok) return err({ tag: 'invalid-from', field, reason: parsed.error });
  const domain = domainOf(address);
  if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
    return err({ tag: 'from-domain-not-allowed', field, domain });
  }
  // Sem display name, address === raw e devolvemos o valor ja marcado (parsed.value).
  // Com display name, preservamos o raw ("Nome <addr>"); o endereco interno ja foi
  // validado acima, entao a reafirmacao de marca e' segura.
  return ok(address === raw ? parsed.value : (raw as EmailAddress));
};

export const parseEmailConfig = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<EmailConfig, EmailConfigError> => {
  const providerName = resolveProviderName(env);
  if (!providerName.ok) return providerName;

  // Allowlist de dominio do remetente (guarda-corpo). Presente -> valida cada
  // remetente resolvivel; ausente ([]) -> nenhuma verificacao (comportamento atual).
  const allowedDomains = parseAllowedDomains(env['EMAIL_FROM_ALLOWED_DOMAINS']);

  // Remetentes: global + por tipo (novos) com fallback ao alias legado.
  const globalFrom = parseFromField('EMAIL_FROM', env['EMAIL_FROM'], allowedDomains);
  if (!globalFrom.ok) return globalFrom;

  const resetFrom = parseFromField(
    'EMAIL_FROM_RESET',
    env['EMAIL_FROM_RESET'] ?? env['AUTH_RESET_FROM'],
    allowedDomains,
  );
  if (!resetFrom.ok) return resetFrom;

  const inviteFrom = parseFromField(
    'EMAIL_FROM_INVITE',
    env['EMAIL_FROM_INVITE'] ?? env['AUTH_INVITE_FROM'],
    allowedDomains,
  );
  if (!inviteFrom.ok) return inviteFrom;

  const notificationFrom = parseFromField(
    'EMAIL_FROM_NOTIFICATION',
    env['EMAIL_FROM_NOTIFICATION'],
    allowedDomains,
  );
  if (!notificationFrom.ok) return notificationFrom;

  // EMAIL_SANDBOX_TO e' destinatario (nao remetente): fora da allowlist ([]).
  const sandboxTo = parseFromField('EMAIL_SANDBOX_TO', env['EMAIL_SANDBOX_TO'], []);
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
