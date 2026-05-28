/**
 * HTTP server configuration — lê do env, aplica defaults seguros.
 * Sem I/O, sem deps externas além de node:process.
 */

export type HttpConfig = Readonly<{
  port: number;
  host: string;
  corsOrigins: readonly string[];
  rateLimitMax: number;
  rateLimitWindow: string;
}>;

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const DEFAULT_RATE_LIMIT_MAX = 200;
const DEFAULT_RATE_LIMIT_WINDOW = '1 minute';

export const readHttpConfig = (env: Readonly<Record<string, string | undefined>>): HttpConfig => {
  const rawPort = env['PORT'];
  const port = rawPort !== undefined ? parseInt(rawPort, 10) : DEFAULT_PORT;

  const host = env['HOST'] ?? DEFAULT_HOST;

  const rawOrigins = env['CORS_ORIGINS'];
  const corsOrigins: readonly string[] =
    rawOrigins !== undefined && rawOrigins.trim().length > 0
      ? rawOrigins.split(',').map((o) => o.trim())
      : [];

  const rawMax = env['RATE_LIMIT_MAX'];
  const rateLimitMax = rawMax !== undefined ? parseInt(rawMax, 10) : DEFAULT_RATE_LIMIT_MAX;

  const rateLimitWindow = env['RATE_LIMIT_WINDOW'] ?? DEFAULT_RATE_LIMIT_WINDOW;

  return { port, host, corsOrigins, rateLimitMax, rateLimitWindow };
};
