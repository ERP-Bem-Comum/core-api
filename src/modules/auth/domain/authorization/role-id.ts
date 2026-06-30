/**
 * RoleId - branded id + generate/rehydrate do modulo auth (RBAC).
 *
 * Module-as-namespace (Padrao D): `import * as RoleId from '...role-id.ts'`.
 * Espelha o padrao de contract-id.ts (UUID v4 via shared/utils/id.ts).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type RoleId = Brand<string, 'RoleId'>;
export type RoleIdError = 'role-id-invalid';

export const generate = (): RoleId => newUuid() as RoleId;

export const rehydrate = (raw: string): Result<RoleId, RoleIdError> =>
  isUuidV4(raw) ? ok(raw as RoleId) : err('role-id-invalid');
