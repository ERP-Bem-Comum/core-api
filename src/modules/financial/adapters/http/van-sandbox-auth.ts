// Autenticação da rota de exercício da VAN — token estático no header `Authorization: Bearer`.
//
// O controle é proporcional ao que a rota PODE fazer, e não ao ambiente em que roda: ela não aceita
// conteúdo do cliente, não escolhe prefixo nem bucket, e grava um arquivo gerado pelo servidor num
// prefixo que o agente não transmite. O pior caso de um token vazado é um objeto inerte em
// `sandbox/` — não um pagamento.
//
// FAIL-CLOSED: sem `VAN_SANDBOX_TOKEN` a rota não é registrada. Não existe modo "sem senha", e por
// isso não existe ambiente onde ela suba desprotegida por esquecimento — que é exatamente o defeito
// do #516 (storage em memória por config ausente, sem erro e sem aviso).
import process from 'node:process';
import { createHash, timingSafeEqual } from 'node:crypto';

// Abaixo disto o token é adivinhável e a proteção vira encenação. 32 caracteres é o que
// `openssl rand -hex 16` já entrega; o valor que recomendamos gerar é o dobro disso.
const MIN_TOKEN_LENGTH = 32;

const BEARER_PATTERN = /^Bearer[ ]+(?<token>\S+)$/iu;

type Env = Readonly<Record<string, string | undefined>>;

export type VanSandboxAuth = Readonly<{ token: string }>;

const warn = (reason: string): void => {
  process.stderr.write(
    `[fin-van-sandbox] rota de exercicio NAO registrada: ${reason}. ` +
      `Defina VAN_SANDBOX_TOKEN com pelo menos ${String(MIN_TOKEN_LENGTH)} caracteres para habilita-la.\n`,
  );
};

/**
 * `undefined` = a rota não deve existir neste processo.
 *
 * Token curto NÃO derruba o boot, e a assimetria com o `PROGRAMS_LOGO_S3_*` é deliberada: aquele
 * guarda dado do usuário que se perderia em silêncio, este é acessório de exercício. Um typo na env
 * derrubando a API inteira em produção seria um estrago maior que o problema que evita. Mas também
 * não degrada calado — o aviso nomeia o motivo, que é o que faltava no #516.
 */
export const readVanSandboxAuth = (env: Env): VanSandboxAuth | undefined => {
  const token = env['VAN_SANDBOX_TOKEN'];

  if (token === undefined || token.length === 0) return undefined;

  if (token.length < MIN_TOKEN_LENGTH) {
    warn(`VAN_SANDBOX_TOKEN tem ${String(token.length)} caracteres`);
    return undefined;
  }

  return { token };
};

// SHA-256 dos dois lados antes de comparar, e não os bytes crus.
//
// `timingSafeEqual` LANÇA quando os comprimentos diferem — então a versão ingênua precisa de um
// `if (a.length !== b.length)` antes, e esse `if` é um oráculo: quem tenta descobre o tamanho do
// token pela resposta. Comparar digests resolve as duas coisas de uma vez, porque digest tem sempre
// 32 bytes: nunca lança, e o tamanho do segredo não influencia nada observável.
const digest = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

/** Extrai o token do header. `undefined` quando o header falta ou não é `Bearer`. */
export const extractBearerToken = (header: string | undefined): string | undefined =>
  header === undefined ? undefined : (BEARER_PATTERN.exec(header)?.groups?.['token'] ?? undefined);

/** Comparação em tempo constante. `===` vazaria o token byte a byte pelo tempo de resposta. */
export const tokenMatches = (given: string, expected: string): boolean =>
  timingSafeEqual(digest(given), digest(expected));

export const isAuthorized = (header: string | undefined, expected: string): boolean => {
  const given = extractBearerToken(header);
  return given !== undefined && tokenMatches(given, expected);
};
