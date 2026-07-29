/**
 * Guarda de boot da chave de assinatura do access token (#515).
 *
 * Antes, `AUTH_JWT_PRIVATE_KEY`/`AUTH_JWT_PUBLIC_KEY` ausentes faziam o boot gerar um par ES256
 * efemero e seguir — inclusive em producao. O sintoma nao era um erro: era sessao morrendo a cada
 * restart e o BFF rejeitando todo token novo, sem nenhuma pista no core-api.
 *
 * Regra: em producao a chave e obrigatoria e a falta derruba o boot; fora de producao o par efemero
 * continua valendo, mas com AVISO. Valor presente porem invalido e erro em QUALQUER ambiente —
 * degradar ali esconderia o engano do operador ate a producao.
 *
 * Molde: `src/shared/persistence/module-driver-config.ts` (#456) e `src/shared/http/email-link-base-urls.ts`
 * (#331/#332). Como aqueles, a funcao e PURA: recebe env por parametro e devolve `Result`. Quem
 * encerra o processo e o `src/server.ts`, com `process.exitCode = 78` (EX_CONFIG).
 *
 * Mensagens em PT sem acentuacao: saem em stderr no boot, antes de qualquer garantia de encoding do
 * coletor de log.
 */
import { importPKCS8, importSPKI } from 'jose';

import { err, ok, type Result } from '#src/shared/primitives/result.ts';
import type { Es256Config } from '../crypto/token-issuer.es256.ts';

type Env = Readonly<Record<string, string | undefined>>;

const PRIVATE_VAR = 'AUTH_JWT_PRIVATE_KEY';
const PUBLIC_VAR = 'AUTH_JWT_PUBLIC_KEY';

/**
 * Par ES256 resolvido a partir do ambiente. Derivado de `Es256Config` por `Pick` — acoplamento por
 * REFERENCIA, nao por duplicacao: se o emissor mudar a forma dessas chaves, isto quebra no
 * typecheck em vez de divergir em silencio (W2/M1).
 */
export type AuthJwtKeys = Pick<Es256Config, 'privateKey' | 'publicKey'>;

type JwtKey = AuthJwtKeys['privateKey'];

/**
 * `keys` ausente significa "gerar par efemero no boot" — o caminho de dev/test, preservado.
 * `warnings` e canal separado do de erros: degradacao aceita fora de producao precisa ser visivel.
 */
export type AuthJwtKeyConfig = Readonly<{
  keys?: AuthJwtKeys;
  warnings: readonly string[];
}>;

/** Variavel presente porem vazia conta como AUSENTE — nunca como valor invalido. */
const readVar = (env: Env, name: string): string | undefined => {
  const value = env[name];
  return value === undefined || value === '' ? undefined : value;
};

/**
 * O VALOR nunca entra na mensagem (CWE-532: material de chave em log; CWE-117: um `\n` no valor
 * forjaria uma linha inteira de diagnostico no stderr). Diferente de `email-link-base-urls.ts`,
 * que ecoa o valor porque base URL nao e segredo, aqui a mensagem cita so o NOME da variavel.
 */
const missingError = (name: string): string =>
  `auth: ${name} nao configurada — obrigatoria em producao (chave de assinatura do access token)`;

const invalidError = (name: string, format: string): string =>
  `auth: ${name} invalida — esperado PEM ${format} de chave ES256 (valor nao exibido)`;

const ephemeralWarning = (): string =>
  `auth: ${PRIVATE_VAR}/${PUBLIC_VAR} nao configuradas — par efemero gerado no boot; ` +
  `os tokens NAO sobrevivem ao restart e cada instancia assina com uma chave diferente`;

/**
 * try/catch e permitido no adapter, convertido para `Result` na borda (`.claude/rules/adapters.md`).
 * Sem isso a excecao de `importPKCS8` sobe ate `main().catch` e o processo sai com exit 1 —
 * indistinguivel de "aplicacao quebrada" para a plataforma de deploy (era o defeito do CA3).
 *
 * O erro capturado e DESCARTADO de proposito: a mensagem do `jose` ecoa o inicio do valor recebido
 * (ex.: `"pkcs8" must be PKCS#8 formatted string`), e material de chave nao vai para log (CWE-532).
 */
const importOrUndefined = async (importKey: () => Promise<JwtKey>): Promise<JwtKey | undefined> => {
  try {
    return await importKey();
  } catch {
    return undefined;
  }
};

export const readAuthJwtKeys = async (
  env: Env,
): Promise<Result<AuthJwtKeyConfig, readonly string[]>> => {
  const isProduction = env['NODE_ENV'] === 'production';
  const priv = readVar(env, PRIVATE_VAR);
  const pub = readVar(env, PUBLIC_VAR);

  if (priv === undefined && pub === undefined) {
    // Ausencia total: erro em producao, degradacao avisada fora dela.
    return isProduction
      ? err([missingError(PRIVATE_VAR), missingError(PUBLIC_VAR)])
      : ok({ warnings: [ephemeralWarning()] });
  }

  // Par incompleto nunca e configuracao valida: uma chave sozinha nao assina e verifica.
  // Vale em qualquer ambiente — cair no efemero aqui ignoraria em silencio a metade configurada.
  if (priv === undefined) return err([missingError(PRIVATE_VAR)]);
  if (pub === undefined) return err([missingError(PUBLIC_VAR)]);

  const privateKey = await importOrUndefined(() => importPKCS8(priv, 'ES256'));
  const publicKey = await importOrUndefined(() => importSPKI(pub, 'ES256'));

  if (privateKey === undefined || publicKey === undefined) {
    const errors: string[] = [];
    if (privateKey === undefined) errors.push(invalidError(PRIVATE_VAR, 'PKCS#8'));
    if (publicKey === undefined) errors.push(invalidError(PUBLIC_VAR, 'SPKI'));
    return err(errors);
  }

  return ok({ keys: { privateKey, publicKey }, warnings: [] });
};
