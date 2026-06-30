/**
 * RefreshTokenId - branded id + generate/rehydrate do modulo auth (sessao).
 *
 * Module-as-namespace (Padrao D). Espelha role-id.ts / user-id.ts (UUID v4). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type RefreshTokenId = Brand<string, 'RefreshTokenId'>;
export type RefreshTokenIdError = 'refresh-token-id-invalid';

export const generate = (): RefreshTokenId => newUuid() as RefreshTokenId;

export const rehydrate = (raw: string): Result<RefreshTokenId, RefreshTokenIdError> =>
  isUuidV4(raw) ? ok(raw as RefreshTokenId) : err('refresh-token-id-invalid');
