/**
 * Port LoginLockoutStore (modulo auth) - persistencia do estado de cooldown por conta (BE-REC-001).
 *
 * Capacidade tecnica (DD-PORTS-01) em application/ports/. O dominio (AccountLockout) e puro; este port
 * apenas le/grava o estado por `userId`. `save` e upsert (cria ou sobrescreve). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { AccountLockout } from '../../domain/session/account-lockout.ts';

export type LoginLockoutStoreError = 'lockout-store-failed';

export type LoginLockoutStore = Readonly<{
  findByUserId: (userId: UserId) => Promise<Result<AccountLockout | null, LoginLockoutStoreError>>;
  save: (lockout: AccountLockout) => Promise<Result<void, LoginLockoutStoreError>>;
}>;
