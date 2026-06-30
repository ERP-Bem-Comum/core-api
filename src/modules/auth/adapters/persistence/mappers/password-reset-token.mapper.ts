// Mapper PasswordResetToken: row MySQL <-> agregado (modulo auth, BE-REC-003). Espelha refresh-token.mapper.
//
//   - passwordResetTokenFromRow(row): Result<PasswordResetToken, PasswordResetTokenMapperError>
//     Escalar (sem JOIN). Ids rehydrate na borda. usedAt Date|null (mode:'date'). Tagged errors (Padrao D).
//   - passwordResetTokenToInsert(token): NewPasswordResetRow
//     Sem Clock (o token carrega seus instantes).
//
// ADR-0020: dialeto MySQL unico, sem JSON. ADR-0014: so auth_*. Zero throw/class no dominio.

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as PasswordResetTokenId from '../../../domain/session/password-reset-token-id.ts';
import * as UserId from '../../../domain/identity/user-id.ts';
import type { PasswordResetToken } from '../../../domain/session/password-reset-token.ts';
import type { PasswordResetRow, NewPasswordResetRow } from '../schemas/mysql.ts';

export type PasswordResetMapperInvalidId = Readonly<{
  tag: 'PasswordResetMapperInvalidId';
  attemptedValue: string;
}>;

export type PasswordResetMapperInvalidUserId = Readonly<{
  tag: 'PasswordResetMapperInvalidUserId';
  attemptedValue: string;
}>;

export type PasswordResetTokenMapperError =
  | PasswordResetMapperInvalidId
  | PasswordResetMapperInvalidUserId;

const invalidId = (attemptedValue: string): PasswordResetMapperInvalidId => ({
  tag: 'PasswordResetMapperInvalidId',
  attemptedValue,
});

const invalidUserId = (attemptedValue: string): PasswordResetMapperInvalidUserId => ({
  tag: 'PasswordResetMapperInvalidUserId',
  attemptedValue,
});

export const passwordResetTokenFromRow = (
  row: Readonly<PasswordResetRow>,
): Result<PasswordResetToken, PasswordResetTokenMapperError> => {
  const idR = PasswordResetTokenId.rehydrate(row.id);
  if (!idR.ok) return err(invalidId(row.id));

  const userIdR = UserId.rehydrate(row.userId);
  if (!userIdR.ok) return err(invalidUserId(row.userId));

  const token: PasswordResetToken = {
    id: idR.value,
    userId: userIdR.value,
    // tokenHash opaco — armazenado e retornado como-esta (ASCII hex)
    tokenHash: row.tokenHash,
    requestedAt: row.requestedAt,
    expiresAt: row.expiresAt,
    // usedAt: nullable (null = pending; Date = consumido)
    usedAt: row.usedAt,
  };

  return ok(token);
};

export const passwordResetTokenToInsert = (token: PasswordResetToken): NewPasswordResetRow => ({
  id: token.id as unknown as string,
  userId: token.userId as unknown as string,
  tokenHash: token.tokenHash,
  requestedAt: token.requestedAt,
  expiresAt: token.expiresAt,
  usedAt: token.usedAt,
});
