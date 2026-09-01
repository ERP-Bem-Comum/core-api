// Configuração do bucket da VAN (ADR-0061).
//
// Conjunto `VAN_S3_*` PRÓPRIO, deliberadamente separado do singleton `S3_*` dos documentos: são
// buckets distintos, possivelmente em contas distintas, e um erro de configuração aqui deposita
// arquivo de pagamento no lugar errado.
//
// O NOME DO BUCKET NÃO PERTENCE AO CÓDIGO. Ele entra por variável de ambiente na task, junto das
// demais configurações — o repositório é público, e manter o bucket de produção fora dele é o que
// permite que ele circule o mínimo possível.
//
// Credencial segue o mesmo desenho do adapter de documentos: ausentes as duas chaves, a resolução
// cai no provider chain (IAM Role/IMDS) — que é como a aplicação roda em produção. XOR entre elas é
// erro, não configuração pela metade.
import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { echoEnvValue } from '../../../../shared/runtime/env-echo.ts';

export type VanS3ConfigError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-prefix'; field: string; raw: string }>
  | Readonly<{ tag: 'invalid-env'; field: string; raw: string }>;

// Diagnóstico legível para quem opera o boot. Toda env lida por este parser é OBRIGATÓRIA em todo
// ambiente — quem consome derruba o processo, e esta é a mensagem que sai antes de ele morrer. Em
// PT sem acentuação: o stderr do boot antecede qualquer garantia de encoding do coletor de log.
//
// Sobre ecoar o valor recusado, e são DOIS riscos distintos:
//
//   - CWE-532 (credencial em log): das três variantes, só `invalid-prefix` e `invalid-env` carregam
//     `raw`, e os únicos campos que as produzem são `VAN_S3_PREFIX_*` e `VAN_S3_FORCE_PATH_STYLE` —
//     nenhum é credencial. O XOR de chave/secret sai como `missing-env`, que carrega só o NOME.
//     Variante nova que devolva `raw` de campo sensível precisa de guarda de FORMA, e sanitizar não
//     serve para isso (ver o docblock de `echoEnvValue`).
//   - CWE-117 (log forging): o valor vem do ambiente e pode conter `\n`. Interpolado cru, forja uma
//     linha inteira no stderr do boot — quem lê vê uma mensagem que ninguém emitiu. `echoEnvValue`
//     é o que fecha isso, e é a mesma régua que o caso 16 da guarda dos 7 drivers já cobrava.
export const describeVanS3ConfigError = (error: VanS3ConfigError): string =>
  error.tag === 'missing-env'
    ? `van-storage: ${error.field} nao configurada — obrigatoria em todo ambiente`
    : `van-storage: ${error.field} com valor invalido "${echoEnvValue(error.raw)}"`;

export type VanPrefixes = Readonly<{
  outbound: string;
  processed: string;
  failed: string;
  returns: string;
  status: string;
  sandbox: string;
}>;

export type VanS3Config = Readonly<{
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  credentials?: Readonly<{ accessKeyId: string; secretAccessKey: string }>;
  prefixes: VanPrefixes;
}>;

// Os cinco do contrato mais o sandbox. Defaults batem com o que o agente usa — mas continuam
// configuráveis, porque quem renomeia prefixo é a infra, não nós.
const DEFAULT_PREFIXES: VanPrefixes = {
  outbound: 'saida/',
  processed: 'processados/',
  failed: 'falhas/',
  returns: 'retorno/',
  status: 'status/',
  sandbox: 'sandbox/',
};

const LOCAL_HOST = /localhost|127\.0\.0\.1|0\.0\.0\.0/;

const FORCE_PATH_STYLE_VAR = 'VAN_S3_FORCE_PATH_STYLE';

const isPresent = (v: string | undefined): v is string => v !== undefined && v !== '';

// Traduz o valor cru de uma env booleana. `undefined` significa "não consigo interpretar isto" — e
// quem chama transforma essa ausência em erro nomeado, nunca em default silencioso.
//
// Duas grafias, e só duas: `true` e `false`, sem distinção de caixa e sem se importar com espaço em
// volta. O que se apara é ruído de transporte — o YAML do compose preserva o espaço de
// `'${VAR:- }'`, e ninguém digita um espaço com intenção. O que NÃO se aceita é sinônimo: `1`, `yes`
// e `on` seriam a mesma intenção escrita de outro jeito, e cada uma delas obriga o próximo leitor a
// descobrir por leitura de código se vale ou não. Duas grafias exatas cabem na cabeça sem consulta.
const readBoolean = (raw: string): boolean | undefined => {
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'true') return true;
  if (normalized === 'false') return false;
  return undefined;
};

// `forcePathStyle` decide se o SDK monta `<bucket>.<host>` (virtual-hosted) ou `<host>/<bucket>`
// (path-style). A heurística acerta os dois extremos — AWS real e localhost — e é cega para o meio:
// hostname de serviço, endpoint de VPC, IP de rede interna passam por ela como se fossem a AWS.
// A env existe para quem opera dizer o que a regex não tem como saber, e vale nos DOIS sentidos.
const resolveForcePathStyle = (
  raw: string | undefined,
  endpoint: string | undefined,
): Result<boolean, VanS3ConfigError> => {
  if (!isPresent(raw)) return ok(isPresent(endpoint) ? LOCAL_HOST.test(endpoint) : false);
  const explicit = readBoolean(raw);
  if (explicit === undefined) {
    return err({ tag: 'invalid-env', field: FORCE_PATH_STYLE_VAR, raw });
  }
  return ok(explicit);
};

// Prefixo tem de terminar em barra: sem ela, `saida` + `X.REM` vira `saidaX.REM` — um objeto na
// raiz do bucket, que o agente nunca vê, e uma remessa que some sem erro algum.
const normalizePrefix = (
  raw: string | undefined,
  fallback: string,
  field: string,
): Result<string, VanS3ConfigError> => {
  if (!isPresent(raw)) return ok(fallback);
  if (raw.startsWith('/')) return err({ tag: 'invalid-prefix', field, raw });
  return ok(raw.endsWith('/') ? raw : `${raw}/`);
};

export const parseVanS3Env = (
  env: Readonly<NodeJS.ProcessEnv>,
): Result<VanS3Config, VanS3ConfigError> => {
  for (const field of ['VAN_S3_REGION', 'VAN_S3_BUCKET'] as const) {
    if (!isPresent(env[field])) return err({ tag: 'missing-env', field });
  }

  const rawKey = env['VAN_S3_ACCESS_KEY_ID'];
  const rawSecret = env['VAN_S3_SECRET_ACCESS_KEY'];
  if (isPresent(rawKey) && !isPresent(rawSecret)) {
    return err({ tag: 'missing-env', field: 'VAN_S3_SECRET_ACCESS_KEY' });
  }
  if (!isPresent(rawKey) && isPresent(rawSecret)) {
    return err({ tag: 'missing-env', field: 'VAN_S3_ACCESS_KEY_ID' });
  }

  const entries: readonly (readonly [keyof VanPrefixes, string])[] = [
    ['outbound', 'VAN_S3_PREFIX_OUTBOUND'],
    ['processed', 'VAN_S3_PREFIX_PROCESSED'],
    ['failed', 'VAN_S3_PREFIX_FAILED'],
    ['returns', 'VAN_S3_PREFIX_RETURNS'],
    ['status', 'VAN_S3_PREFIX_STATUS'],
    ['sandbox', 'VAN_S3_PREFIX_SANDBOX'],
  ];

  const prefixes: Record<string, string> = {};
  for (const [key, field] of entries) {
    const resolved = normalizePrefix(env[field], DEFAULT_PREFIXES[key], field);
    if (!resolved.ok) return resolved;
    prefixes[key] = resolved.value;
  }

  const endpoint = env['VAN_S3_ENDPOINT'];
  const region = env['VAN_S3_REGION'] ?? '';

  const forcePathStyle = resolveForcePathStyle(env[FORCE_PATH_STYLE_VAR], endpoint);
  if (!forcePathStyle.ok) return forcePathStyle;

  return ok({
    bucket: env['VAN_S3_BUCKET'] ?? '',
    region,
    ...(isPresent(endpoint) ? { endpoint } : {}),
    forcePathStyle: forcePathStyle.value,
    ...(isPresent(rawKey) && isPresent(rawSecret)
      ? { credentials: { accessKeyId: rawKey, secretAccessKey: rawSecret } }
      : {}),
    prefixes: prefixes as unknown as VanPrefixes,
  });
};
