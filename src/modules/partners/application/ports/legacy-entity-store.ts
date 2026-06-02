/**
 * Port LegacyEntityStore (modulo partners) - persistencia ciente de legacy_id para a ETL.
 *
 * Generico por entidade (Supplier/Financier/Collaborator/UserProfile): os repos padrao fazem
 * upsert by id e nao conhecem legacy_id. Este port (slice PARTNERS-ETL-WRITE-PORT) correlaciona
 * o registro migrado ao id do legado e e idempotente por legacy_id (skip, NUNCA UPDATE - re-run
 * nao sobrescreve). A construcao do agregado (rehydrate) fica no CORE; aqui so persiste. ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';

export type PartnersEtlStoreError = 'partners-etl-store-unavailable';

export type ProvisionOutcome = 'created' | 'already-exists';

export type LegacyEntityStore<A, Ref> = Readonly<{
  // Correlacao por legacy_id: retorna a Ref (PK) ja migrada, ou null.
  findByLegacyId: (legacyId: number) => Promise<Result<Ref | null, PartnersEtlStoreError>>;
  // Insert idempotente: grava o agregado + legacy_id. Se o legacy_id ja existe, no-op ('already-exists').
  provision: (
    aggregate: A,
    legacyId: number,
  ) => Promise<Result<ProvisionOutcome, PartnersEtlStoreError>>;
}>;
