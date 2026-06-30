/**
 * Blocklist de senhas vazadas/comuns do modulo auth (BE-REC-005, OWASP WSTG-ATHN-07).
 *
 * NIST 800-63B 5.1.1.2: prioriza comprimento + checagem contra senhas conhecidas, em vez de
 * regras de composicao. Lista LOCAL (offline, sem rede - alinha supply-chain ADR-0011): as senhas
 * mais comuns em vazamentos publicos. Comparacao case-insensitive (a politica nao normaliza a senha
 * em si - DD-USER-04 -, mas a blocklist compara o lowercase para pegar variacoes triviais de caixa).
 * ASCII puro.
 */

// Top senhas vazadas (subconjunto curado). Manter em lowercase; a checagem normaliza a entrada.
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  'password',
  'password1',
  'password123',
  'passw0rd',
  'p@ssw0rd',
  '12345678',
  '123456789',
  '1234567890',
  '123123123',
  'qwerty123',
  'qwertyuiop',
  'qwerty12345',
  '1q2w3e4r',
  '1qaz2wsx',
  'iloveyou',
  'admin123',
  'administrator',
  'welcome1',
  'welcome123',
  'letmein123',
  'abc12345',
  'football',
  'baseball',
  'sunshine',
  'princess',
  'whatever',
  'trustno1',
  'superman',
  'starwars',
  'monkey123',
  'dragon123',
  'master123',
  'changeme',
  'changeme123',
  'senha123',
  'senha1234',
  'mudar123',
  'brasil123',
  'verao2026',
  'verao@2026',
]);

/** `true` se a senha (case-insensitive) consta na blocklist de senhas comuns/vazadas. */
export const isCommon = (raw: string): boolean => COMMON_PASSWORDS.has(raw.toLowerCase());
