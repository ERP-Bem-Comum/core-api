/**
 * Composition root do módulo auth para a borda HTTP (ADR-0006/0028).
 *
 * Monta os adapters concretos por driver (memory|mysql) e instancia os use cases.
 * `AuthHttpDeps` expõe os use cases prontos — o plugin HTTP só os invoca, sem conhecer
 * adapter algum. Espelha o padrão `contracts/cli/{context,drivers}`.
 *
 * Chaves ES256 (DD-TOKEN-01): carregadas de env (PKCS8/SPKI) ou geradas efêmeras em dev.
 */

import { randomBytes } from 'node:crypto';
import { generateKeyPair, importPKCS8, importSPKI } from 'jose';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';

import { makeInMemoryUserStore } from '../persistence/repos/user-repository.in-memory.ts';
import { makeInMemoryRefreshTokenStore } from '../persistence/repos/refresh-token-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '../persistence/repos/role-repository.in-memory.ts';
import { createDrizzleUserStore } from '../persistence/repos/user-repository.drizzle.ts';
import { createDrizzleRefreshTokenStore } from '../persistence/repos/refresh-token-repository.drizzle.ts';
import { createDrizzleRoleStore } from '../persistence/repos/role-repository.drizzle.ts';
import { openAuthMysql } from '../persistence/drivers/mysql-driver.ts';
import { makeArgon2PasswordHasher } from '../crypto/password-hasher.argon2.ts';
import { makeInMemoryLoginLockoutStore } from '../persistence/repos/login-lockout-store.in-memory.ts';
import { makeNodeRefreshTokenMinter } from '../crypto/refresh-token-minter.node.ts';
import { makeEs256TokenIssuer, type Es256Config } from '../crypto/token-issuer.es256.ts';

import { registerUser } from '../../application/use-cases/register-user.ts';
import { authenticateUser } from '../../application/use-cases/authenticate-user.ts';
import { refreshAccessToken } from '../../application/use-cases/refresh-access-token.ts';
import {
  revokeSession,
  revokeAllSessionsForUser,
} from '../../application/use-cases/revoke-session.ts';
import { changePassword } from '../../application/use-cases/change-password.ts';

import type { UserReader, UserRepository } from '../../domain/identity/user/repository.ts';
import type { RefreshTokenRepository } from '../../domain/session/refresh-token-repository.ts';
import type { RoleRepository } from '../../domain/authorization/role-repository.ts';
import type { TokenIssuer } from '../../application/ports/token-issuer.ts';
import type { PasswordHasher } from '../../application/ports/password-hasher.ts';
import type { LockoutPolicy } from '../../domain/session/account-lockout.ts';
import type { Clock } from '#src/shared/ports/clock.ts';

// Seed RBAC (CONTRACTS-HTTP-READS C1, D4): bootstrap de permissões para dev/test.
import type { preHandlerAsyncHookHandler } from 'fastify';
import * as Email from '../../domain/identity/email.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import * as Role from '../../domain/authorization/role.ts';
import * as User from '../../domain/identity/user/user.ts';
import { makeAuthorize } from './auth-hook.ts';

export type AuthDriver = 'memory' | 'mysql';

/** Usuário semeado no bootstrap RBAC (C1 D4). Recebe um Role inline com `permissions`. */
export type AuthSeedUser = Readonly<{
  email: string;
  password: string;
  permissions: readonly string[];
}>;

/** Seed RBAC — dev/test. Resolve o bootstrap (registerUser cria `roles:[]`; assignRole exige ator privilegiado). */
export type AuthSeed = Readonly<{ users: readonly AuthSeedUser[] }>;

export type AuthCompositionConfig = Readonly<{
  driver: AuthDriver;
  /** Obrigatório para driver mysql. */
  connectionString?: string;
  issuer?: string;
  accessTtlSeconds?: number;
  refreshTtlSeconds?: number;
  /** Seed RBAC inline (dev/test). Aplicado após os stores; cria users com Role embutido. */
  seed?: AuthSeed;
  /**
   * Rate-limit dedicado e mais restritivo das rotas sensíveis (`/login`, `/refresh`) — BE-REC-001,
   * OWASP WSTG-ATHN-03. Separado do teto global (200/min). Default: 5 por minuto.
   */
  sensitiveRateLimit?: Readonly<{ max: number; timeWindow: string }>;
  /** Política do account lockout (BE-REC-001). Default: 5 falhas → 1/5/15/60min progressivo. */
  lockoutPolicy?: LockoutPolicy;
}>;

export type AuthHttpDeps = Readonly<{
  registerUser: ReturnType<typeof registerUser>;
  authenticateUser: ReturnType<typeof authenticateUser>;
  refreshAccessToken: ReturnType<typeof refreshAccessToken>;
  revokeSession: ReturnType<typeof revokeSession>;
  changePassword: ReturnType<typeof changePassword>;
  revokeAllSessionsForUser: ReturnType<typeof revokeAllSessionsForUser>;
  /** Verificador de access JWT — consumido pelo preHandler `requireAuth`. */
  verifyAccessToken: TokenIssuer['verifyAccessToken'];
  /**
   * Fábrica de preHandler RBAC por NOME de permissão (C1 D1). Recebe `string` (não o VO
   * `Permission`) para não vazar `auth/domain` a outros módulos (ADR-0006); valida internamente.
   */
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
  /** Config do rate-limit dedicado das rotas sensíveis (login/refresh) — BE-REC-001. */
  sensitiveRateLimit: Readonly<{ max: number; timeWindow: string }>;
  shutdown: () => Promise<void>;
}>;

const DEFAULT_ISSUER = 'core-api';
const DEFAULT_ACCESS_TTL = 900; // 15 min
const DEFAULT_REFRESH_TTL = 2_592_000; // 30 dias
// BE-REC-001: poucas tentativas por minuto num endpoint de senha (vs 200/min global).
const DEFAULT_SENSITIVE_RATE_LIMIT = { max: 5, timeWindow: '1 minute' } as const;
// BE-REC-001: cooldown por conta — 5 falhas → 1min, depois 5/15min, cap 60min. Sempre temporário.
const DEFAULT_LOCKOUT_POLICY: LockoutPolicy = { threshold: 5, stepsMinutes: [1, 5, 15, 60] };

type Stores = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  refreshTokenRepo: RefreshTokenRepository;
  roleRepo: RoleRepository;
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
    const roleStore = makeInMemoryRoleStore();
    return {
      userReader: userStore.reader,
      userRepo: userStore.repository,
      refreshTokenRepo: refreshStore.repository,
      roleRepo: roleStore.repository,
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
  const roleStore = createDrizzleRoleStore(handle, ClockReal());
  return {
    userReader: userStore.reader,
    userRepo: userStore.repository,
    refreshTokenRepo: refreshStore.repository,
    roleRepo: roleStore.repository,
    shutdown: handle.close,
  };
};

// Bootstrap RBAC (C1 D4): cria cada seed user com um Role contendo as permissions, bypassa o use
// case `assignRole` (que exige ator com `user:assign-role` — chicken-and-egg).
// O Role é PERSISTIDO no `roleRepo` ANTES do `userRepo.save`: em mysql a FK `auth_user_role.role_id`
// → `auth_role.id` exige o role já gravado (em memory não há FK, mas persistir mantém o invariante).
// `throw` aqui é erro de configuração no boot (dev/test), convertido pelo last-resort handler do server.
type SeedDeps = Readonly<{
  userRepo: UserRepository;
  roleRepo: RoleRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
}>;

const applyRbacSeed = async (seed: AuthSeed, deps: SeedDeps): Promise<void> => {
  for (const u of seed.users) {
    const email = Email.parse(u.email);
    if (!email.ok) throw new Error(`auth-seed: email invalido (${u.email}): ${email.error}`);
    const password = Password.parse(u.password);
    if (!password.ok) {
      throw new Error(`auth-seed: senha invalida p/ ${u.email}: ${password.error}`);
    }
    const hashed = await deps.passwordHasher.hash(password.value);
    if (!hashed.ok) throw new Error(`auth-seed: hash falhou p/ ${u.email}: ${hashed.error}`);
    const permissions = u.permissions.map((p) => {
      const parsed = Permission.parse(p);
      if (!parsed.ok) throw new Error(`auth-seed: permission invalida (${p}): ${parsed.error}`);
      return parsed.value;
    });
    const role = Role.create({ id: RoleId.generate(), name: `seed:${u.email}`, permissions });
    if (!role.ok) throw new Error(`auth-seed: role invalido p/ ${u.email}: ${role.error}`);
    const roleSaved = await deps.roleRepo.save(role.value);
    if (!roleSaved.ok) {
      throw new Error(`auth-seed: save de role falhou p/ ${u.email}: ${roleSaved.error}`);
    }
    const { user } = User.register(
      {
        id: UserId.generate(),
        email: email.value,
        passwordHash: hashed.value,
        roles: [role.value],
      },
      deps.clock.now(),
    );
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) throw new Error(`auth-seed: save falhou p/ ${u.email}: ${saved.error}`);
  }
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

  // Hash dummy do login anti-timing (BE-REC-002): computado uma vez no boot a partir de uma senha
  // aleatoria (nunca corresponde a credencial real). Custo de setup unico; o verify por request usa-o.
  const dummyPlain = Password.parse(randomBytes(24).toString('base64'));
  if (!dummyPlain.ok) throw new Error('auth-composition: falha ao gerar dummy password');
  const dummyHashR = await passwordHasher.hash(dummyPlain.value);
  if (!dummyHashR.ok) throw new Error('auth-composition: falha ao gerar dummy hash');
  const dummyPasswordHash = dummyHashR.value;

  // BE-REC-001: store do cooldown por conta. In-memory por ora (mesma limitação do rate-limit;
  // adapter persistente é follow-up CTR-AUTH-LOCKOUT-PERSISTENCE).
  const lockoutStore = makeInMemoryLoginLockoutStore();
  const lockoutPolicy = config.lockoutPolicy ?? DEFAULT_LOCKOUT_POLICY;

  if (config.seed !== undefined) {
    await applyRbacSeed(config.seed, {
      userRepo: stores.userRepo,
      roleRepo: stores.roleRepo,
      passwordHasher,
      clock,
    });
  }

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
      dummyPasswordHash,
      lockoutStore,
      lockoutPolicy,
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
    changePassword: changePassword({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      passwordHasher,
      refreshTokenRepo: stores.refreshTokenRepo,
      clock,
    }),
    revokeAllSessionsForUser: revokeAllSessionsForUser({
      refreshTokenRepo: stores.refreshTokenRepo,
      clock,
    }),
    verifyAccessToken: tokenIssuer.verifyAccessToken,
    sensitiveRateLimit: config.sensitiveRateLimit ?? DEFAULT_SENSITIVE_RATE_LIMIT,
    authorize: (permissionName: string): preHandlerAsyncHookHandler => {
      const parsed = Permission.parse(permissionName);
      if (!parsed.ok) {
        throw new Error(`auth-composition: permission invalida no wiring (${permissionName})`);
      }
      return makeAuthorize(stores.userReader)(parsed.value);
    },
    shutdown: stores.shutdown,
  };
};
