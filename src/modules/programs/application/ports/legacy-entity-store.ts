/**
 * Port LegacyEntityStore (modulo programs) - persistencia ciente de legacy_id para a ETL.
 *
 * Generico por entidade (aqui, Program): os repos padrao fazem upsert by id e nao conhecem
 * legacy_id. Este port (fatia PROGRAMS-ETL-WRITE-PORT) correlaciona o registro migrado ao id do
 * legado e e idempotente por legacy_id (skip, NUNCA UPDATE - re-run nao sobrescreve). A construcao
 * do agregado (via Program.create) fica no CORE/mapper; aqui so persiste. ASCII puro. Espelha
 * src/modules/partners/application/ports/legacy-entity-store.ts.
 */

import type { Result } from '../../../../shared/primitives/result.ts';

export type ProgramsEtlStoreError =
  | 'programs-etl-store-unavailable'
  | 'programs-etl-store-integrity-violation';

export type ProvisionOutcome = 'created' | 'already-exists';

export type LegacyEntityStore<A, Ref> = Readonly<{
  // Correlacao por legacy_id: retorna a Ref (PK) ja migrada, ou null.
  findByLegacyId: (legacyId: number) => Promise<Result<Ref | null, ProgramsEtlStoreError>>;
  // Insert idempotente: grava o agregado + legacy_id. Se o legacy_id ja existe, no-op ('already-exists').
  provision: (
    aggregate: A,
    legacyId: number,
  ) => Promise<Result<ProvisionOutcome, ProgramsEtlStoreError>>;
}>;
