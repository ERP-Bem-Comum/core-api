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

// Duplicata de dado do legado tem erro NOMEADO, nunca `unavailable`: a ETL precisa distinguir
// "o dado colide" de "o banco caiu" para decidir entre higienizar e retentar.
//   `cpf-already-registered`   -> o cpf ja e de OUTRO usuario. O use case DEGRADA o campo para
//                                 null e re-tenta: um campo de perfil opcional nao vale o
//                                 registro inteiro.
//   `email-already-registered` -> o email ja e de OUTRO usuario. NAO da para degradar (email e
//                                 obrigatorio e e a identidade do login), entao PROPAGA para
//                                 quem orquestra a ETL decidir — hoje, abortar o registro.
export type ProvisionedUserStoreError =
  | 'provisioned-user-store-unavailable'
  | 'cpf-already-registered'
  | 'email-already-registered';

export type ProvisionedUserStore = Readonly<{
  // Correlacao por legacy_id: retorna o UserId ja migrado, ou null se ausente.
  findByLegacyId: (legacyId: number) => Promise<Result<UserId | null, ProvisionedUserStoreError>>;
  // Insert idempotente: grava o user (com roles) + legacy_id. Se o legacy_id ja existe, no-op (ok).
  provision: (
    user: ActiveUser,
    legacyId: number,
  ) => Promise<Result<void, ProvisionedUserStoreError>>;
}>;
