/**
 * HTTP server configuration — lê do env, aplica defaults seguros.
 * Sem I/O, sem deps externas. Parse defensivo: env malformado cai no default
 * (resiliência operacional), nunca NaN silencioso nem boot derrubado.
 */

/** trustProxy: false (não confiar), true (atrás de proxy), ou CIDR/CSV de hops confiáveis. */
export type TrustProxy = boolean | string;

export type HttpConfig = Readonly<{
  port: number;
  host: string;
  corsOrigins: readonly string[];
  rateLimitMax: number;
  rateLimitWindow: string;
  /** Confiança em X-Forwarded-*. Default true (core atrás do BFF); prod deve usar o CIDR do BFF. */
  trustProxy: TrustProxy;
  /** ms até abortar request lenta (anti-slowloris). */
  requestTimeout: number;
  /** ms de keep-alive de conexão ociosa. */
  keepAliveTimeout: number;
}>;

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_RATE_LIMIT_MAX = 200;
const DEFAULT_RATE_LIMIT_WINDOW = '1 minute';
const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_KEEP_ALIVE_TIMEOUT_MS = 72_000;

/** parseInt defensivo: ignora vazio/NaN/negativo, devolve o default. */
const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  if (raw === undefined || raw.trim().length === 0) return fallback;
  const n = Number.parseInt(raw, 10);
  if (!Number.isInteger(n) || n <= 0) return fallback;
  return n;
};

const parsePort = (raw: string | undefined): number => {
  const n = parsePositiveInt(raw, DEFAULT_PORT);
  return n <= 65_535 ? n : DEFAULT_PORT;
};

const parseTrustProxy = (raw: string | undefined): TrustProxy => {
  if (raw === undefined || raw.trim().length === 0) return true;
  const v = raw.trim();
  if (v === 'true') return true;
  if (v === 'false') return false;
  return v; // CIDR ou CSV de hops confiáveis (ex.: '10.0.0.0/8')
};

export const readHttpConfig = (env: Readonly<Record<string, string | undefined>>): HttpConfig => {
  const port = parsePort(env['PORT']);
  const host = env['HOST'] ?? DEFAULT_HOST;

  const rawOrigins = env['CORS_ORIGINS'];
  const corsOrigins: readonly string[] =
    rawOrigins !== undefined && rawOrigins.trim().length > 0
      ? rawOrigins.split(',').map((o) => o.trim())
      : [];

  const rateLimitMax = parsePositiveInt(env['RATE_LIMIT_MAX'], DEFAULT_RATE_LIMIT_MAX);
  const rateLimitWindow = env['RATE_LIMIT_WINDOW'] ?? DEFAULT_RATE_LIMIT_WINDOW;

  const trustProxy = parseTrustProxy(env['TRUST_PROXY']);
  const requestTimeout = parsePositiveInt(env['REQUEST_TIMEOUT_MS'], DEFAULT_REQUEST_TIMEOUT_MS);
  const keepAliveTimeout = parsePositiveInt(
    env['KEEP_ALIVE_TIMEOUT_MS'],
    DEFAULT_KEEP_ALIVE_TIMEOUT_MS,
  );

  return {
    port,
    host,
    corsOrigins,
    rateLimitMax,
    rateLimitWindow,
    trustProxy,
    requestTimeout,
    keepAliveTimeout,
  };
};
