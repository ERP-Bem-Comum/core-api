// Adapter Drizzle de UserProfileRepository (módulo partners).
//
//   - findByUserRef/findByCpf: SELECT + mapper.
//   - save: SELECT-then-UPDATE-or-INSERT por user_ref (ADR-0020 — sem ON DUPLICATE KEY).
//     UNIQUE `par_user_profiles_cpf_idx` → ER_DUP_ENTRY (1062) → user-profile-cpf-duplicate.
//
// ADR-0020: sem ODKU. ADR-0014: só par_*. Boundary: try/catch → Result (zero throw).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type {
  UserProfileRepository,
  UserProfileRepositoryError,
} from '#src/modules/partners/domain/user-profile/repository.ts';
import type { UserProfile } from '#src/modules/partners/domain/user-profile/types.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  userProfileToInsert,
  userProfileFromRow,
  type UserProfileMapperError,
} from '../mappers/user-profile.mapper.ts';
import type { UserProfileRow } from '../schemas/mysql.ts';

const isCpfDupEntry = (e: unknown): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (
        obj['errno'] === 1062 &&
        typeof obj['sqlMessage'] === 'string' &&
        obj['sqlMessage'].includes('par_user_profiles_cpf_idx')
      ) {
        return true;
      }
    }
  }
  return false;
};

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-user-profile-repo:${scope}] ${String(cause)}\n`);
};

const reconstruct = (
  row: Readonly<UserProfileRow>,
): Result<UserProfile, UserProfileRepositoryError> => {
  const mapped = userProfileFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('mapper', mapped.error satisfies UserProfileMapperError);
  return err('user-profile-repo-unavailable');
};

export const createDrizzleUserProfileStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): UserProfileRepository => {
  const { db, schema } = handle;
  const table = schema.parUserProfiles;

  return {
    findByUserRef: async (userRef: UserRef) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.userRef, userRef as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByUserRef', cause);
        return err('user-profile-repo-unavailable');
      }
    },

    findByCpf: async (cpf: Cpf) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.cpf, cpf as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByCpf', cause);
        return err('user-profile-repo-unavailable');
      }
    },

    save: async (profile: UserProfile) => {
      const now = clock.now();
      const row = userProfileToInsert(profile, now);
      try {
        const existing = await db
          .select({ userRef: table.userRef })
          .from(table)
          .where(eq(table.userRef, row.userRef))
          .limit(1);

        if (existing.length > 0) {
          const { createdAt: _createdAt, ...rest } = row;
          await db
            .update(table)
            .set({ ...rest, updatedAt: now })
            .where(eq(table.userRef, row.userRef));
        } else {
          await db.insert(table).values(row);
        }
        return ok(undefined);
      } catch (cause) {
        if (isCpfDupEntry(cause)) return err('user-profile-cpf-duplicate');
        logRepo('save', cause);
        return err('user-profile-repo-unavailable');
      }
    },
  };
};
