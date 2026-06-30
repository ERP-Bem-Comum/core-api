/**
 * UserId - branded id + generate/rehydrate do modulo auth.
 *
 * Module-as-namespace (Padrao D). Espelha role-id.ts / contract-id.ts (UUID v4).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type UserId = Brand<string, 'UserId'>;
export type UserIdError = 'user-id-invalid';

export const generate = (): UserId => newUuid() as UserId;

export const rehydrate = (raw: string): Result<UserId, UserIdError> =>
  isUuidV4(raw) ? ok(raw as UserId) : err('user-id-invalid');
