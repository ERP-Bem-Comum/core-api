/**
 * Public-API de provisionamento ETL do modulo auth (AUTH-ETL-USER-PROVISIONING).
 *
 * Unico ponto pelo qual a ETL (slice PARTNERS-ETL-WRITER, fora de src/) cria auth.User para
 * usuarios migrados, SEM tocar os internos do auth (ADR-0006 / D14). Monta o port a partir de
 * uma connection-string MySQL, sem subir Fastify: wira o driver, os stores Drizzle e o hasher
 * argon2 real. O segredo da senha e random e descartado (D16 — fail-closed). ASCII puro.
 */

import { randomBytes } from 'node:crypto';

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { ClockReal } from '../../../shared/adapters/clock-real.ts';
import {
  openAuthMysql,
  type AuthMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleProvisionedUserStore } from '../adapters/persistence/repos/provisioned-user-store.drizzle.ts';
import { createDrizzleRoleStore } from '../adapters/persistence/repos/role-repository.drizzle.ts';
import { makeArgon2PasswordHasher } from '../adapters/crypto/password-hasher.argon2.ts';
import {
  provisionLegacyUser,
  type ProvisionLegacyUserInput,
  type ProvisionLegacyUserOutput,
  type ProvisionLegacyUserError,
} from '../application/use-cases/provision-legacy-user.ts';

export type {
  ProvisionLegacyUserInput,
  ProvisionLegacyUserOutput,
  ProvisionLegacyUserError,
} from '../application/use-cases/provision-legacy-user.ts';

export type AuthEtlPort = Readonly<{
  provisionLegacyUser: (
    input: ProvisionLegacyUserInput,
  ) => Promise<Result<ProvisionLegacyUserOutput, ProvisionLegacyUserError>>;
  close: () => Promise<void>;
}>;

export type BuildAuthEtlPortOptions = Readonly<{ connectionString: string }>;

export type BuildAuthEtlPortError = AuthMysqlDriverError;

export const buildAuthEtlPort = async (
  opts: BuildAuthEtlPortOptions,
): Promise<Result<AuthEtlPort, BuildAuthEtlPortError>> => {
  // ETL one-shot: aplica migrations (idempotente) — garante auth_user.legacy_id presente.
  const handleR = await openAuthMysql({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const clock = ClockReal();
  const store = createDrizzleProvisionedUserStore(handle, clock);
  const { repository: roleRepo } = createDrizzleRoleStore(handle, clock);
  const passwordHasher = makeArgon2PasswordHasher();
  // Segredo random forte por usuario; descartado apos o hash (nunca persistido em claro).
  const secret = (): string => randomBytes(32).toString('base64url');

  const run = provisionLegacyUser({ store, roleRepo, passwordHasher, clock, secret });

  return ok({
    provisionLegacyUser: run,
    close: async () => handle.close(),
  });
};
