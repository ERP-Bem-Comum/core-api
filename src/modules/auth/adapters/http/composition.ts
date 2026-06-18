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
import { inMemoryUserQuery } from '../persistence/repos/user-query.in-memory.ts';
import { createDrizzleUserQuery } from '../persistence/repos/user-query.drizzle.ts';
import { makeInMemoryRefreshTokenStore } from '../persistence/repos/refresh-token-repository.in-memory.ts';
import { makeInMemoryRoleStore } from '../persistence/repos/role-repository.in-memory.ts';
import { createDrizzleUserStore } from '../persistence/repos/user-repository.drizzle.ts';
import { createDrizzleRefreshTokenStore } from '../persistence/repos/refresh-token-repository.drizzle.ts';
import { createDrizzleRoleStore } from '../persistence/repos/role-repository.drizzle.ts';
import { openAuthMysql } from '../persistence/drivers/mysql-driver.ts';
import { makeArgon2PasswordHasher } from '../crypto/password-hasher.argon2.ts';
import { makeNodePasswordResetTokenMinter } from '../crypto/password-reset-token-minter.node.ts';
import { makeInMemoryLoginLockoutStore } from '../persistence/repos/login-lockout-store.in-memory.ts';
import { makeInMemoryPasswordResetTokenStore } from '../persistence/repos/password-reset-token-repository.in-memory.ts';
import { createDrizzlePasswordResetTokenStore } from '../persistence/repos/password-reset-token-repository.drizzle.ts';
import { InMemoryAuthOutbox } from '../outbox/auth-outbox.in-memory.ts';
import { createDrizzleLoginLockoutStore } from '../persistence/repos/login-lockout-store.drizzle.ts';
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
import { listUserPermissions } from '../../application/use-cases/list-user-permissions.ts';
import { getUserPermissions } from '../../application/use-cases/get-user-permissions.ts';
import { listPermissionCatalog } from '../../application/use-cases/list-permission-catalog.ts';
import { listRoles } from '../../application/use-cases/list-roles.ts';
import { createRole } from '../../application/use-cases/create-role.ts';
import { updateRole } from '../../application/use-cases/update-role.ts';
import { archiveRole } from '../../application/use-cases/archive-role.ts';
import { assignRole } from '../../application/use-cases/assign-role.ts';
import { revokeRole } from '../../application/use-cases/revoke-role.ts';
import { listUsers } from '../../application/use-cases/list-users.ts';
import { getUser } from '../../application/use-cases/get-user.ts';
import { createUserByAdmin } from '../../application/use-cases/create-user-by-admin.ts';
import { updateUserProfile } from '../../application/use-cases/update-user-profile.ts';
import {
  activateUser,
  deactivateUser,
} from '../../application/use-cases/activate-deactivate-user.ts';
import {
  setProfilePhoto,
  removeProfilePhoto,
} from '../../application/use-cases/set-profile-photo.ts';
import { getProfilePhoto } from '../../application/use-cases/get-profile-photo.ts';
import { makeInMemoryProfilePhotoStorage } from '../storage/profile-photo-storage.in-memory.ts';
import { createS3ProfilePhotoStorage } from '../storage/profile-photo-storage.s3.ts';
import type { ProfilePhotoStorage } from '../../application/ports/profile-photo-storage.ts';
import { requestPasswordReset } from '../../application/use-cases/request-password-reset.ts';
import { confirmPasswordReset } from '../../application/use-cases/confirm-password-reset.ts';

import type { UserReader, UserRepository } from '../../domain/identity/user/repository.ts';
import type { RefreshTokenRepository } from '../../domain/session/refresh-token-repository.ts';
import type { RoleRepository } from '../../domain/authorization/role-repository.ts';
import type { TokenIssuer } from '../../application/ports/token-issuer.ts';
import type { PasswordHasher } from '../../application/ports/password-hasher.ts';
import type { LockoutPolicy } from '../../domain/session/account-lockout.ts';
import type { PasswordResetTokenRepository } from '../../domain/session/password-reset-token-repository.ts';
import type { LoginLockoutStore } from '../../application/ports/login-lockout-store.ts';
import type { UserQuery } from '../../application/ports/user-query.ts';
import type { Clock } from '#src/shared/ports/clock.ts';

// Seed RBAC (CONTRACTS-HTTP-READS C1, D4): bootstrap de permissões para dev/test.
import type { FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import * as Email from '../../domain/identity/email.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import * as Role from '../../domain/authorization/role.ts';
import * as User from '../../domain/identity/user/user.ts';
import { makeAuthorize, makeHasPermission } from './auth-hook.ts';

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
  /** Origem confiável do link de reset (BE-REC-003). Nunca derivada do header Host. */
  resetBaseUrl?: string;
  /** TTL do token de reset em segundos (BE-REC-003). Default: 900 (15min). */
  resetTtlSeconds?: number;
  /** Origem confiável do link de ativação (spec 005 US3). Nunca derivada do header Host. */
  activationBaseUrl?: string;
  /** TTL do token de ativação em segundos (spec 005 US3). Default: 604800 (7 dias). */
  inviteTtlSeconds?: number;
}>;

export type AuthHttpDeps = Readonly<{
  registerUser: ReturnType<typeof registerUser>;
  authenticateUser: ReturnType<typeof authenticateUser>;
  refreshAccessToken: ReturnType<typeof refreshAccessToken>;
  revokeSession: ReturnType<typeof revokeSession>;
  changePassword: ReturnType<typeof changePassword>;
  /** Permissões efetivas do usuário (GET /me → `can()` do front). */
  listUserPermissions: ReturnType<typeof listUserPermissions>;
  /** Permissões efetivas de um usuário (spec 006 US1) — consumido por GET /api/v1/users/:id/permissions. */
  getUserPermissions: ReturnType<typeof getUserPermissions>;
  /** Catálogo fixo de permissões (spec 006 US2) — consumido por GET /api/v1/permissions. */
  listPermissionCatalog: ReturnType<typeof listPermissionCatalog>;
  /** Listagem de papéis com suas permissões (spec 006 US3) — consumido por GET /api/v1/roles. */
  listRoles: ReturnType<typeof listRoles>;
  /** Criação de papel (spec 006 US5) — consumido por POST /api/v1/roles. */
  createRole: ReturnType<typeof createRole>;
  /** Edição de papel (spec 006 US6) — consumido por PUT /api/v1/roles/:id. */
  updateRole: ReturnType<typeof updateRole>;
  /** Desativação de papel (spec 006 US7) — consumido por PATCH /api/v1/roles/:id/deactivate. */
  archiveRole: ReturnType<typeof archiveRole>;
  /** Atribuição de papel a usuário (spec 006 US4) — consumido por POST /api/v1/users/:id/roles. */
  assignRole: ReturnType<typeof assignRole>;
  /** Revogação de papel de usuário (spec 006 US4) — consumido por DELETE /api/v1/users/:id/roles/:roleId. */
  revokeRole: ReturnType<typeof revokeRole>;
  revokeAllSessionsForUser: ReturnType<typeof revokeAllSessionsForUser>;
  /** Verificador de access JWT — consumido pelo preHandler `requireAuth`. */
  verifyAccessToken: TokenIssuer['verifyAccessToken'];
  /**
   * Fábrica de preHandler RBAC por NOME de permissão (C1 D1). Recebe `string` (não o VO
   * `Permission`) para não vazar `auth/domain` a outros módulos (ADR-0006); valida internamente.
   */
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
  /**
   * Checagem CONSULTÁVEL de permissão (não-preHandler): `(req, permissionName) => Promise<boolean>`.
   * Para autorização condicional no handler (ex.: editar campo vital). Nega por padrão em falha.
   */
  hasPermission: (req: FastifyRequest, permissionName: string) => Promise<boolean>;
  /** Config do rate-limit dedicado das rotas sensíveis (login/refresh) — BE-REC-001. */
  sensitiveRateLimit: Readonly<{ max: number; timeWindow: string }>;
  /** Use case do fluxo de reset (BE-REC-003), consumido pela rota /forgot-password. */
  requestPasswordReset: ReturnType<typeof requestPasswordReset>;
  /** Confirma o reset (BE-REC-003), consumido pela rota /reset-password. */
  confirmPasswordReset: ReturnType<typeof confirmPasswordReset>;
  /** Listagem administrativa de usuários (spec 005 US1, ADR-0037) — consumido por GET /api/v1/users. */
  listUsers: ReturnType<typeof listUsers>;
  /** Detalhe administrativo de usuário (spec 005 US2) — consumido por GET /api/v1/users/:id. */
  getUser: ReturnType<typeof getUser>;
  /** Criação administrativa de usuário + convite (spec 005 US3) — consumido por POST /api/v1/users. */
  createUserByAdmin: ReturnType<typeof createUserByAdmin>;
  /** Edição administrativa de perfil (spec 005 US4) — consumido por PUT /api/v1/users/:id. */
  updateUserProfile: ReturnType<typeof updateUserProfile>;
  /** Reativação de usuário (spec 005 US5) — consumido por PATCH /api/v1/users/:id/activate. */
  activateUser: ReturnType<typeof activateUser>;
  /** Desativação de usuário (spec 005 US5) — consumido por PATCH /api/v1/users/:id/deactivate. */
  deactivateUser: ReturnType<typeof deactivateUser>;
  /** Upload de foto de perfil (spec 005 US6) — consumido por PUT /api/v1/users/:id/photo. */
  setProfilePhoto: ReturnType<typeof setProfilePhoto>;
  /** Remoção de foto de perfil (spec 005 US6) — consumido por DELETE /api/v1/users/:id/photo. */
  removeProfilePhoto: ReturnType<typeof removeProfilePhoto>;
  /** Leitura dos bytes da foto (USR-ME-PHOTO-DISPLAY) — GET /api/v1/me/photo e /users/:id/photo. */
  getProfilePhoto: ReturnType<typeof getProfilePhoto>;
  shutdown: () => Promise<void>;
}>;

const DEFAULT_ISSUER = 'core-api';
const DEFAULT_ACCESS_TTL = 900; // 15 min
const DEFAULT_REFRESH_TTL = 2_592_000; // 30 dias
// BE-REC-001: poucas tentativas por minuto num endpoint de senha (vs 200/min global).
const DEFAULT_SENSITIVE_RATE_LIMIT = { max: 5, timeWindow: '1 minute' } as const;
// BE-REC-001: cooldown por conta — 5 falhas → 1min, depois 5/15min, cap 60min. Sempre temporário.
const DEFAULT_LOCKOUT_POLICY: LockoutPolicy = { threshold: 5, stepsMinutes: [1, 5, 15, 60] };
// BE-REC-003: TTL curto do token de reset + origem default (dev). Prod sobrepõe via config/env.
const DEFAULT_RESET_TTL = 900; // 15 min
const DEFAULT_RESET_BASE_URL = 'http://localhost:3000/reset-password';
const DEFAULT_INVITE_TTL = 604_800; // 7 dias (convite mais generoso que reset)
const DEFAULT_ACTIVATION_BASE_URL = 'http://localhost:3000/activate';

type Stores = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  refreshTokenRepo: RefreshTokenRepository;
  resetTokenRepo: PasswordResetTokenRepository;
  lockoutStore: LoginLockoutStore;
  roleRepo: RoleRepository;
  userQuery: UserQuery;
  profilePhotoStorage: ProfilePhotoStorage;
  shutdown: () => Promise<void>;
}>;

// Storage da foto (spec 005 US6): S3/MinIO se as env S3_* estiverem completas; senao in-memory
// (fallback SEGURO p/ dev/test sem storage — espelha o no-op do mailer). ADR-0019.
const buildProfilePhotoStorage = (env: Readonly<NodeJS.ProcessEnv>): ProfilePhotoStorage => {
  const endpoint = env['S3_ENDPOINT'];
  const region = env['S3_REGION'];
  const accessKeyId = env['S3_ACCESS_KEY_ID'];
  const secretAccessKey = env['S3_SECRET_ACCESS_KEY'];
  const bucket = env['S3_BUCKET'];
  if (
    endpoint !== undefined &&
    region !== undefined &&
    accessKeyId !== undefined &&
    secretAccessKey !== undefined &&
    bucket !== undefined &&
    endpoint.length > 0 &&
    bucket.length > 0
  ) {
    return createS3ProfilePhotoStorage({
      endpoint,
      region,
      accessKeyId,
      secretAccessKey,
      bucket,
      forcePathStyle: env['S3_FORCE_PATH_STYLE'] !== 'false',
    });
  }
  return makeInMemoryProfilePhotoStorage();
};

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
    // AUTH-DOMAIN-OUTBOX (ADR-0047): outbox de eventos de dominio (dark-launch — sem consumidor).
    // No driver memory injetamos um InMemoryAuthOutbox no store de reset/invite-token para que
    // saveWithEvents acumule PasswordResetRequested/UserInvited (paridade com o Drizzle).
    const authOutbox = InMemoryAuthOutbox();
    return {
      userReader: userStore.reader,
      userRepo: userStore.repository,
      refreshTokenRepo: refreshStore.repository,
      resetTokenRepo: makeInMemoryPasswordResetTokenStore(authOutbox.port).repository,
      lockoutStore: makeInMemoryLoginLockoutStore(),
      roleRepo: roleStore.repository,
      userQuery: inMemoryUserQuery(userStore.snapshot),
      profilePhotoStorage: makeInMemoryProfilePhotoStorage(),
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
    resetTokenRepo: createDrizzlePasswordResetTokenStore(handle).repository,
    lockoutStore: createDrizzleLoginLockoutStore(handle).repository,
    roleRepo: roleStore.repository,
    userQuery: createDrizzleUserQuery(handle),
    profilePhotoStorage: buildProfilePhotoStorage(process.env),
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
  userReader: UserReader;
  roleRepo: RoleRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
}>;

const applyRbacSeed = async (seed: AuthSeed, deps: SeedDeps): Promise<void> => {
  for (const u of seed.users) {
    const email = Email.parse(u.email);
    if (!email.ok) throw new Error(`auth-seed: email invalido (${u.email}): ${email.error}`);

    const existingUser = await deps.userReader.findByEmail(email.value);
    if (!existingUser.ok) {
      throw new Error(
        `auth-seed: falha ao buscar usuario por email (${u.email}): ${existingUser.error}`,
      );
    }
    if (existingUser.value !== null) {
      // Usuario ja existe no banco, pula o seed para este usuario
      continue;
    }

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

// ADR-0047 (fatia 02b — NOTIF-EMAIL-OUTBOX-RETIRE): os builders sincronos de mailer de reset/convite
// foram REMOVIDOS. O envio de e-mail e do consumidor (worker `email-dispatch`); o produtor (auth)
// apenas EMITE o evento na tx (auth_outbox). O composition nao monta mais nenhum mailer sincrono.

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

  // BE-REC-001: store do cooldown por conta — InMemory (memory) ou Drizzle (mysql), via buildStores.
  const lockoutStore = stores.lockoutStore;
  const lockoutPolicy = config.lockoutPolicy ?? DEFAULT_LOCKOUT_POLICY;

  // ADR-0047 (fatia 02 — NOTIF-EMAIL-EVENT-CONSUMER): o ENVIO de e-mail (reset/convite) deixou de
  // ser sincrono no use case. O produtor (auth) apenas EMITE o evento na tx (auth_outbox); o envio
  // e do consumidor (worker `email-dispatch`). Por isso o composition NAO monta mais `resetMailer`/
  // `inviteMailer` para os use cases — sem chamada sincrona => sem duplicacao. Os builders sincronos
  // legados foram removidos na fatia 02b (`NOTIF-EMAIL-OUTBOX-RETIRE`).
  const resetMinter = makeNodePasswordResetTokenMinter();
  const resetBaseUrl = config.resetBaseUrl ?? DEFAULT_RESET_BASE_URL;
  const resetTtlSeconds = config.resetTtlSeconds ?? DEFAULT_RESET_TTL;

  const activationBaseUrl = config.activationBaseUrl ?? DEFAULT_ACTIVATION_BASE_URL;
  const inviteTtlSeconds = config.inviteTtlSeconds ?? DEFAULT_INVITE_TTL;

  if (config.seed !== undefined) {
    await applyRbacSeed(config.seed, {
      userRepo: stores.userRepo,
      userReader: stores.userReader,
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
    listUserPermissions: listUserPermissions({ userReader: stores.userReader }),
    getUserPermissions: getUserPermissions({ userReader: stores.userReader }),
    listPermissionCatalog: listPermissionCatalog(),
    listRoles: listRoles({ roleRepository: stores.roleRepo }),
    createRole: createRole({ roleRepository: stores.roleRepo }),
    updateRole: updateRole({ roleRepository: stores.roleRepo }),
    archiveRole: archiveRole({ roleRepository: stores.roleRepo }),
    assignRole: assignRole({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      roleRepo: stores.roleRepo,
      clock,
    }),
    revokeRole: revokeRole({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      roleRepo: stores.roleRepo,
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
    requestPasswordReset: requestPasswordReset({
      userReader: stores.userReader,
      resetTokenRepo: stores.resetTokenRepo,
      minter: resetMinter,
      clock,
      resetTtlSeconds,
      resetBaseUrl,
    }),
    confirmPasswordReset: confirmPasswordReset({
      resetTokenRepo: stores.resetTokenRepo,
      minter: resetMinter,
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      passwordHasher,
      refreshTokenRepo: stores.refreshTokenRepo,
      clock,
    }),
    listUsers: listUsers({ userQuery: stores.userQuery }),
    getUser: getUser({ userReader: stores.userReader }),
    createUserByAdmin: createUserByAdmin({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      roleRepo: stores.roleRepo,
      resetTokenRepo: stores.resetTokenRepo,
      minter: resetMinter,
      clock,
      unusablePasswordHash: dummyPasswordHash,
      inviteTtlSeconds,
      activationBaseUrl,
    }),
    updateUserProfile: updateUserProfile({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      roleRepo: stores.roleRepo,
      clock,
    }),
    activateUser: activateUser({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      clock,
    }),
    deactivateUser: deactivateUser({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      clock,
    }),
    setProfilePhoto: setProfilePhoto({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      storage: stores.profilePhotoStorage,
      clock,
    }),
    removeProfilePhoto: removeProfilePhoto({
      userReader: stores.userReader,
      userRepo: stores.userRepo,
      storage: stores.profilePhotoStorage,
      clock,
    }),
    getProfilePhoto: getProfilePhoto({
      userReader: stores.userReader,
      storage: stores.profilePhotoStorage,
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
    hasPermission: makeHasPermission(stores.userReader),
    // ADR-0047 (fatia 02): o composition nao monta mais os mailers (envio e do worker
    // `email-dispatch`); nao ha pool de outbox de e-mail para fechar aqui.
    shutdown: async () => {
      await stores.shutdown();
    },
  };
};
