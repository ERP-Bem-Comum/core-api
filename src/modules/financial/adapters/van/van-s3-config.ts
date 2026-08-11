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

export type VanS3ConfigError =
  | Readonly<{ tag: 'missing-env'; field: string }>
  | Readonly<{ tag: 'invalid-prefix'; field: string; raw: string }>;

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

const isPresent = (v: string | undefined): v is string => v !== undefined && v !== '';

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

  return ok({
    bucket: env['VAN_S3_BUCKET'] ?? '',
    region,
    ...(isPresent(endpoint) ? { endpoint } : {}),
    forcePathStyle: isPresent(endpoint) ? LOCAL_HOST.test(endpoint) : false,
    ...(isPresent(rawKey) && isPresent(rawSecret)
      ? { credentials: { accessKeyId: rawKey, secretAccessKey: rawSecret } }
      : {}),
    prefixes: prefixes as unknown as VanPrefixes,
  });
};
