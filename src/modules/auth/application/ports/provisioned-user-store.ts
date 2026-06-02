/**
 * Port ProvisionedUserStore (modulo auth) - persistencia ciente de legacy_id para a ETL.
 *
 * O UserRepository padrao faz upsert by id e nao conhece legacy_id; este port existe para o
 * bootstrap one-shot (AUTH-ETL-USER-PROVISIONING): correlaciona o usuario migrado ao id do
 * legado e e idempotente por legacy_id (skip, NUNCA UPDATE - re-run nao sobrescreve senha ja
 * resetada). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { ActiveUser } from '../../domain/identity/user/types.ts';

export type ProvisionedUserStoreError = 'provisioned-user-store-unavailable';

export type ProvisionedUserStore = Readonly<{
  // Correlacao por legacy_id: retorna o UserId ja migrado, ou null se ausente.
  findByLegacyId: (legacyId: number) => Promise<Result<UserId | null, ProvisionedUserStoreError>>;
  // Insert idempotente: grava o user (com roles) + legacy_id. Se o legacy_id ja existe, no-op (ok).
  provision: (
    user: ActiveUser,
    legacyId: number,
  ) => Promise<Result<void, ProvisionedUserStoreError>>;
}>;
