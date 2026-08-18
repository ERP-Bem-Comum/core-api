/**
 * Configuração do storage de logo de programa — com fail-fast em produção (#516).
 *
 * Antes disto, o `server.ts` devolvia `undefined` sempre que a config faltasse, e o módulo subia com
 * storage EM MEMÓRIA, em qualquer ambiente, sem erro e sem aviso. O upload respondia sucesso e o
 * arquivo evaporava no restart. Medido em 2026-07-22: nem produção nem QA declaravam qualquer
 * `PROGRAMS_LOGO_*` — os dois serviam logo de um store volátil, e ninguém tinha sido avisado.
 *
 * É a mesma classe de defeito que o #456 matou para o driver de persistência, e a regra aqui é a
 * dele: **em produção, "esqueci de configurar" e "quero rodar sem storage" não podem ser
 * indistinguíveis.** Fora de produção, degrada — mas avisando.
 *
 * ⚠️ A diferença para o #456, e a razão de este arquivo não ser uma cópia dele: **ausência das duas
 * credenciais é caminho LEGÍTIMO**, não erro. É assim que a aplicação roda no ECS, onde quem
 * autentica é o IAM Role da task via provider chain. Exigir chave estática aqui quebraria produção
 * para "consertar" um defeito de produção.
 *
 * As mensagens vão sem acentuação, como as dos dois precedentes de boot
 * (`shared/persistence/module-driver-config.ts`, `shared/http/email-link-base-urls.ts`): saem em
 * stderr de contêiner, antes de qualquer logger.
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { isProductionEnv } from '#src/shared/runtime/node-env.ts';
import type { LogoS3Config } from '../storage/logo-storage.s3.ts';

export type ProgramsLogoConfigResult = Readonly<{
  /** `undefined` = storage em memória (só fora de produção, e sempre com aviso). */
  config: LogoS3Config | undefined;
  warnings: readonly string[];
}>;

type Env = Readonly<Record<string, string | undefined>>;

const ENDPOINT_VAR = 'PROGRAMS_LOGO_S3_ENDPOINT';
const BUCKET_VAR = 'PROGRAMS_LOGO_S3_BUCKET';
const REGION_VAR = 'PROGRAMS_LOGO_S3_REGION';
const KEY_VAR = 'PROGRAMS_LOGO_S3_ACCESS_KEY_ID';
const SECRET_VAR = 'PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY';
const FORCE_PATH_STYLE_VAR = 'PROGRAMS_LOGO_S3_FORCE_PATH_STYLE';

const present = (v: string | undefined): v is string => v !== undefined && v.length > 0;

const missingError = (vars: readonly string[]): string =>
  `programs: storage de logo nao configurado em producao — defina ${vars.join(' e ')}. ` +
  `Sem isso o logo enviado pelo usuario seria aceito e perdido no proximo restart.`;

const xorError = (defined: string, absent: string): string =>
  `programs: credencial de storage de logo pela metade — ${defined} definida sem ${absent}. ` +
  `Defina as duas, ou NENHUMA para autenticar pelo IAM Role da task (provider chain).`;

const memoryWarning = (reason: string): string =>
  `programs: storage de logo EM MEMORIA (${reason}) — o logo enviado NAO sobrevive ao restart.`;

export const readProgramsLogoConfig = (
  env: Env,
): Result<ProgramsLogoConfigResult, readonly string[]> => {
  const isProduction = isProductionEnv(env);
  const endpoint = env[ENDPOINT_VAR];
  const bucket = env[BUCKET_VAR];

  // CA1 — em produção o boot falha nomeando TODAS as que faltam de uma vez (o mesmo diagnóstico
  // completo numa tentativa que o #456 exige); fora dela, memória COM aviso (CA4).
  if (!present(endpoint) || !present(bucket)) {
    const missing = [
      ...(present(endpoint) ? [] : [ENDPOINT_VAR]),
      ...(present(bucket) ? [] : [BUCKET_VAR]),
    ];
    return isProduction
      ? err([missingError(missing)])
      : ok({ config: undefined, warnings: [memoryWarning(`${missing.join(', ')} ausente`)] });
  }

  const accessKeyId = env[KEY_VAR];
  const secretAccessKey = env[SECRET_VAR];
  const hasKey = present(accessKeyId);
  const hasSecret = present(secretAccessKey);

  // CA2 — XOR é sempre erro de configuração, nunca "sem credencial". Antes caía em memória em
  // silêncio: a metade configurada era ignorada, e o sintoma aparecia só no restart seguinte.
  if (hasKey !== hasSecret) {
    const message = hasKey ? xorError(KEY_VAR, SECRET_VAR) : xorError(SECRET_VAR, KEY_VAR);
    return isProduction
      ? err([message])
      : ok({ config: undefined, warnings: [memoryWarning(message)] });
  }

  // CA3 — endpoint e bucket presentes, ambas as credenciais ausentes: provider chain (IAM Role).
  // Caminho legítimo e o de produção; nunca pode virar erro.
  const credentialFields: Readonly<{ accessKeyId?: string; secretAccessKey?: string }> =
    hasKey && hasSecret ? { accessKeyId, secretAccessKey } : {};

  return ok({
    config: {
      endpoint,
      region: env[REGION_VAR] ?? 'us-east-1',
      ...credentialFields,
      bucket,
      forcePathStyle: env[FORCE_PATH_STYLE_VAR] !== 'false',
    },
    warnings: [],
  });
};
