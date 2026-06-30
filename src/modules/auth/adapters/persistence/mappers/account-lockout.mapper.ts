// Mapper AccountLockout: row MySQL <-> agregado (modulo auth, BE-REC-001). Espelha refresh-token.mapper.
//
//   - accountLockoutFromRow(row): Result<AccountLockout, AccountLockoutMapperError>
//     Escalar (sem JOIN). userId rehydrate na borda. lockedUntil Date|null (mode:'date'). Tagged errors.
//   - accountLockoutToInsert(lockout): NewLoginLockoutRow
//     Sem Clock (o agregado carrega o instante de lockedUntil).
//
// ADR-0020: dialeto MySQL unico, sem JSON. ADR-0014: so auth_*. Zero throw/class no dominio.

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as UserId from '../../../domain/identity/user-id.ts';
import type { AccountLockout } from '../../../domain/session/account-lockout.ts';
import type { LoginLockoutRow, NewLoginLockoutRow } from '../schemas/mysql.ts';

export type AccountLockoutMapperInvalidUserId = Readonly<{
  tag: 'AccountLockoutMapperInvalidUserId';
  attemptedValue: string;
}>;

export type AccountLockoutMapperError = AccountLockoutMapperInvalidUserId;

const invalidUserId = (attemptedValue: string): AccountLockoutMapperInvalidUserId => ({
  tag: 'AccountLockoutMapperInvalidUserId',
  attemptedValue,
});

export const accountLockoutFromRow = (
  row: Readonly<LoginLockoutRow>,
): Result<AccountLockout, AccountLockoutMapperError> => {
  const userIdR = UserId.rehydrate(row.userId);
  if (!userIdR.ok) return err(invalidUserId(row.userId));

  const lockout: AccountLockout = {
    userId: userIdR.value,
    failedAttempts: row.failedAttempts,
    // mode:'date' -> Date (ou null = sem bloqueio ativo)
    lockedUntil: row.lockedUntil,
  };

  return ok(lockout);
};

export const accountLockoutToInsert = (lockout: AccountLockout): NewLoginLockoutRow => ({
  userId: lockout.userId as unknown as string,
  failedAttempts: lockout.failedAttempts,
  lockedUntil: lockout.lockedUntil,
});
