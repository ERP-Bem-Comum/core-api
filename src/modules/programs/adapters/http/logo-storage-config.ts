/**
 * Configuração do storage de logo de programa — fail-fast em todo ambiente (#516, ADR-0068).
 *
 * Antes do #516, o `server.ts` devolvia `undefined` sempre que a config faltasse, e o módulo subia
 * com storage EM MEMÓRIA, em qualquer ambiente, sem erro e sem aviso. O upload respondia sucesso e o
 * arquivo evaporava no restart. Medido em 2026-07-22: nem produção nem QA declaravam qualquer
 * `PROGRAMS_LOGO_*` — os dois serviam logo de um store volátil, e ninguém tinha sido avisado.
 *
 * O #516 curou isso **só em produção**. O ADR-0068 (31/08/2026) removeu a assimetria: configuração
 * ausente ou recusada derruba o boot em TODO ambiente, local inclusive.
 *
 * Por que sem exceção: em homologação e produção as envs são postas à mão, na console da AWS, por
 * quem opera a infraestrutura — degradar ali não protege ninguém, porque o sinal não chega a quem
 * poderia corrigir. E local que degrada deixa de espelhar hml/prod, que é exatamente como um defeito
 * de configuração sobrevive até o deploy. Para rodar sem storage local, não se sobe o módulo.
 *
 * ⚠️ **A exceção que permanece, e ela NÃO é degradação:** ausência das duas credenciais é caminho
 * LEGÍTIMO, não erro. É assim que a aplicação roda no ECS, onde quem autentica é o IAM Role da task
 * via provider chain. Exigir chave estática aqui quebraria produção para "consertar" um defeito de
 * produção. O que continua sendo erro é o XOR — uma das duas presente sem a outra.
 *
 * As mensagens vão sem acentuação, como as dos dois precedentes de boot
 * (`shared/persistence/module-driver-config.ts`, `shared/http/email-link-base-urls.ts`): saem em
 * stderr de contêiner, antes de qualquer logger.
 */
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { LogoS3Config } from '../storage/logo-storage.s3.ts';

type Env = Readonly<Record<string, string | undefined>>;

const ENDPOINT_VAR = 'PROGRAMS_LOGO_S3_ENDPOINT';
const BUCKET_VAR = 'PROGRAMS_LOGO_S3_BUCKET';
const REGION_VAR = 'PROGRAMS_LOGO_S3_REGION';
const KEY_VAR = 'PROGRAMS_LOGO_S3_ACCESS_KEY_ID';
const SECRET_VAR = 'PROGRAMS_LOGO_S3_SECRET_ACCESS_KEY';
const FORCE_PATH_STYLE_VAR = 'PROGRAMS_LOGO_S3_FORCE_PATH_STYLE';

const present = (v: string | undefined): v is string => v !== undefined && v.length > 0;

const missingError = (vars: readonly string[]): string =>
  `programs: storage de logo nao configurado — defina ${vars.join(' e ')}. ` +
  `Obrigatorio em TODO ambiente (ADR-0068): sem isso o logo enviado pelo usuario seria aceito e ` +
  `perdido no proximo restart.`;

const xorError = (defined: string, absent: string): string =>
  `programs: credencial de storage de logo pela metade — ${defined} definida sem ${absent}. ` +
  `Defina as duas, ou NENHUMA para autenticar pelo IAM Role da task (provider chain).`;

export const readProgramsLogoConfig = (env: Env): Result<LogoS3Config, readonly string[]> => {
  const endpoint = env[ENDPOINT_VAR];
  const bucket = env[BUCKET_VAR];

  // CA1 — o boot falha nomeando TODAS as que faltam de uma vez (o mesmo diagnóstico completo numa
  // tentativa que o #456 exige). Sob o ADR-0068 isso vale em qualquer ambiente.
  if (!present(endpoint) || !present(bucket)) {
    const missing = [
      ...(present(endpoint) ? [] : [ENDPOINT_VAR]),
      ...(present(bucket) ? [] : [BUCKET_VAR]),
    ];
    return err([missingError(missing)]);
  }

  const accessKeyId = env[KEY_VAR];
  const secretAccessKey = env[SECRET_VAR];
  const hasKey = present(accessKeyId);
  const hasSecret = present(secretAccessKey);

  // CA2 — XOR é sempre erro de configuração, nunca "sem credencial". Antes do #516 caía em memória
  // em silêncio: a metade configurada era ignorada, e o sintoma aparecia só no restart seguinte.
  if (hasKey !== hasSecret) {
    return err([hasKey ? xorError(KEY_VAR, SECRET_VAR) : xorError(SECRET_VAR, KEY_VAR)]);
  }

  // CA3 — endpoint e bucket presentes, ambas as credenciais ausentes: provider chain (IAM Role).
  // Caminho legítimo e o de produção; nunca pode virar erro.
  const credentialFields: Readonly<{ accessKeyId?: string; secretAccessKey?: string }> =
    hasKey && hasSecret ? { accessKeyId, secretAccessKey } : {};

  return ok({
    endpoint,
    region: env[REGION_VAR] ?? 'us-east-1',
    ...credentialFields,
    bucket,
    forcePathStyle: env[FORCE_PATH_STYLE_VAR] !== 'false',
  });
};
