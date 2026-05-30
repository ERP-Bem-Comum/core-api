/**
 * PasswordResetTokenId - branded id + generate/rehydrate (BE-REC-003).
 *
 * Module-as-namespace (Padrao D). Espelha refresh-token-id.ts (UUID v4). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type PasswordResetTokenId = Brand<string, 'PasswordResetTokenId'>;
export type PasswordResetTokenIdError = 'password-reset-token-id-invalid';

export const generate = (): PasswordResetTokenId => newUuid() as PasswordResetTokenId;

export const rehydrate = (raw: string): Result<PasswordResetTokenId, PasswordResetTokenIdError> =>
  isUuidV4(raw) ? ok(raw as PasswordResetTokenId) : err('password-reset-token-id-invalid');
