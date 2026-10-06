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

// `cpf-already-registered`: o cpf do registro legado ja pertence a OUTRO usuario (UNIQUE
// auth_user_cpf_idx, migration 0010). Erro nomeado, e nao `unavailable`, porque a ETL o trata
// como dado a degradar — nao como falha de infra. Quem decide degradar e o use case.
export type ProvisionedUserStoreError =
  | 'provisioned-user-store-unavailable'
  | 'cpf-already-registered';

export type ProvisionedUserStore = Readonly<{
  // Correlacao por legacy_id: retorna o UserId ja migrado, ou null se ausente.
  findByLegacyId: (legacyId: number) => Promise<Result<UserId | null, ProvisionedUserStoreError>>;
  // Insert idempotente: grava o user (com roles) + legacy_id. Se o legacy_id ja existe, no-op (ok).
  provision: (
    user: ActiveUser,
    legacyId: number,
  ) => Promise<Result<void, ProvisionedUserStoreError>>;
}>;
