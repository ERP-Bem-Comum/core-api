/**
 * Composition root do módulo auth para a borda HTTP (ADR-0006/0028).
 *
 * Monta os adapters concretos por driver (memory|mysql) e instancia os use cases.
 * `AuthHttpDeps` expõe os use cases prontos — o plugin HTTP só os invoca, sem conhecer
 * adapter algum. Espelha o padrão `contracts/cli/{context,drivers}`.
 *
 * Chaves ES256 (DD-TOKEN-01): carregadas de env (PKCS8/SPKI) ou geradas efêmeras em dev.
 */

import { generateKeyPair, importPKCS8, importSPKI } from 'jose';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import { makeInMemoryUserStore } from '../persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRefreshTokenStore } from '../persistence/repos/refresh-token-repository.in-memory.ts';
import { createDrizzleUserStore } from '../persistence/repos/user-repository.drizzle.ts';
import { createDrizzleRefreshTokenStore } from '../persistence/repos/refresh-token-repository.drizzle.ts';
import { openAuthMysql } from '../persistence/drivers/mysql-driver.ts';
import { makeArgon2PasswordHasher } from '../crypto/password-hasher.argon2.ts';
import { makeNodeRefreshTokenMinter } from '../crypto/refresh-token-minter.node.ts';
import { makeEs256TokenIssuer, type Es256Config } from '../crypto/token-issuer.es256.ts';

import { registerUser } from '../../application/use-cases/register-user.ts';
import { authenticateUser } from '../../application/use-cases/authenticate-user.ts';
import { refreshAccessToken } from '../../application/use-cases/refresh-access-token.ts';
import { revokeSession } from '../../application/use-cases/revoke-session.ts';

import type { UserReader, UserRepository } from '../../domain/identity/user/repository.ts';
import type { RefreshTokenRepository } from '../../domain/session/refresh-token-repository.ts';
import type { TokenIssuer } from '../../application/ports/token-issuer.ts';

export type AuthDriver = 'memory' | 'mysql';

export type AuthCompositionConfig = Readonly<{
  driver: AuthDriver;
  /** Obrigatório para driver mysql. */
  connectionString?: string;
  issuer?: string;
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
}>;

export type AuthHttpDeps = Readonly<{
  registerUser: ReturnType<typeof registerUser>;
  authenticateUser: ReturnType<typeof authenticateUser>;
  refreshAccessToken: ReturnType<typeof refreshAccessToken>;
  revokeSession: ReturnType<typeof revokeSession>;
  /** Verificador de access JWT — consumido pelo preHandler `requireAuth`. */
  verifyAccessToken: TokenIssuer['verifyAccessToken'];
  shutdown: () => Promise<void>;
}>;

const DEFAULT_ISSUER = 'core-api';
const DEFAULT_ACCESS_TTL = 900; // 15 min
const DEFAULT_REFRESH_TTL = 2_592_000; // 30 dias

type Stores = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  refreshTokenRepo: RefreshTokenRepository;
  shutdown: () => Promise<void>;
}>;

const loadOrGenerateKeys = async (
  env: Readonly<Record<string, string | undefined>>,
): Promise<Pick<Es256Config, 'privateKey' | 'publicKey'>> => {
  const priv = env['AUTH_JWT_PRIVATE_KEY'];
  const pub = env['AUTH_JWT_PUBLIC_KEY'];
  if (priv !== undefined && priv.length > 0 && pub !== undefined && pub.length > 0) {
    const privateKey = await importPKCS8(priv, 'ES256');
    const publicKey = await importSPKI(pub, 'ES256');
    return { privateKey, publicKey };
  }
  // Dev/test: par efêmero — tokens não sobrevivem a restart (aceitável fora de prod).
  return generateKeyPair('ES256', { extractable: false });
};

const buildStores = async (config: AuthCompositionConfig): Promise<Stores> => {
  if (config.driver === 'memory') {
    const userStore = makeInMemoryUserStore();
    const refreshStore = makeInMemoryRefreshTokenStore();
    return {
      userReader: userStore.reader,
      userRepo: userStore.repository,
      refreshTokenRepo: refreshStore.repository,
      shutdown: () => Promise.resolve(),
    };
  }

  if (config.connectionString === undefined || config.connectionString.length === 0) {
    throw new Error('auth-composition: driver mysql exige connectionString');
  }
  const handleR = await openAuthMysql({
    connectionString: config.connectionString,
    applyMigrations: true,
  });
  if (!handleR.ok) throw new Error(`auth-composition: falha ao abrir MySQL (${handleR.error})`);
  const handle = handleR.value;

  const userStore = createDrizzleUserStore(handle, ClockReal());
  const refreshStore = createDrizzleRefreshTokenStore(handle);
  return {
    userReader: userStore.reader,
    userRepo: userStore.repository,
    refreshTokenRepo: refreshStore.repository,
    shutdown: handle.close,
  };
};

export const buildAuthHttpDeps = async (config: AuthCompositionConfig): Promise<AuthHttpDeps> => {
  const issuer = config.issuer ?? DEFAULT_ISSUER;
  const accessTtlSeconds = config.accessTtlSeconds ?? DEFAULT_ACCESS_TTL;
  const refreshTtlSeconds = config.refreshTtlSeconds ?? DEFAULT_REFRESH_TTL;

  const stores = await buildStores(config);
  const keys = await loadOrGenerateKeys(process.env);
  const tokenIssuer = makeEs256TokenIssuer({ ...keys, issuer, ttlSeconds: accessTtlSeconds });
  const passwordHasher = makeArgon2PasswordHasher();
  const refreshTokenMinter = makeNodeRefreshTokenMinter();
  const clock = ClockReal();

  return {
    registerUser: registerUser({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      passwordHasher,
      clock,
    }),
    authenticateUser: authenticateUser({
      userReader: stores.userReader,
      passwordHasher,
      tokenIssuer,
      refreshTokenMinter,
      refreshTokenRepo: stores.refreshTokenRepo,
      clock,
      refreshTtlSeconds,
    }),
    refreshAccessToken: refreshAccessToken({
      userReader: stores.userReader,
      tokenIssuer,
      refreshTokenMinter,
      refreshTokenRepo: stores.refreshTokenRepo,
      clock,
      refreshTtlSeconds,
    }),
    revokeSession: revokeSession({
      refreshTokenMinter,
      refreshTokenRepo: stores.refreshTokenRepo,
      clock,
    }),
    verifyAccessToken: tokenIssuer.verifyAccessToken,
    shutdown: stores.shutdown,
  };
};
