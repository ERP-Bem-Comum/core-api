/**
 * Public-API de provisionamento ETL do modulo partners (PARTNERS-ETL-WRITE-PORT).
 *
 * Unico ponto pelo qual a ETL (orquestrador 3b-ii, fora de src/) persiste os agregados das 4
 * entidades par_*, SEM tocar os internos de persistencia (ADR-0006 / D14, espelha buildAuthEtlPort).
 * Idempotente por legacy_id (skip, nunca UPDATE). Monta os stores a partir de uma connection-string,
 * sem subir Fastify. ASCII puro.
 */

import { type Result, ok, err } from '../../../shared/primitives/result.ts';
import { ClockReal } from '../../../shared/adapters/clock-real.ts';
import {
  openPartnersMysql,
  type PartnersMysqlDriverError,
} from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePartnersEtlStores } from '../adapters/persistence/repos/partners-etl-store.drizzle.ts';
import type { LegacyEntityStore } from '../application/ports/legacy-entity-store.ts';
import type { Supplier } from '../domain/supplier/types.ts';
import type { Financier } from '../domain/financier/types.ts';
import type { Collaborator } from '../domain/collaborator/types.ts';
import type { UserProfile } from '../domain/user-profile/types.ts';
import type { SupplierId } from '../domain/supplier/supplier-id.ts';
import type { FinancierId } from '../domain/financier/financier-id.ts';
import type { CollaboratorId } from '../domain/collaborator/collaborator-id.ts';
import type { UserRef } from '../../../shared/kernel/user-ref.ts';

export type {
  LegacyEntityStore,
  PartnersEtlStoreError,
  ProvisionOutcome,
} from '../application/ports/legacy-entity-store.ts';

export type PartnersEtlPort = Readonly<{
  suppliers: LegacyEntityStore<Supplier, SupplierId>;
  financiers: LegacyEntityStore<Financier, FinancierId>;
  collaborators: LegacyEntityStore<Collaborator, CollaboratorId>;
  userProfiles: LegacyEntityStore<UserProfile, UserRef>;
  close: () => Promise<void>;
}>;

export type BuildPartnersEtlPortOptions = Readonly<{ connectionString: string }>;

export type BuildPartnersEtlPortError = PartnersMysqlDriverError;

export const buildPartnersEtlPort = async (
  opts: BuildPartnersEtlPortOptions,
): Promise<Result<PartnersEtlPort, BuildPartnersEtlPortError>> => {
  // ETL one-shot: aplica migrations (idempotente). legacy_id ja existe nas par_* (P2).
  const handleR = await openPartnersMysql({
    connectionString: opts.connectionString,
    applyMigrations: true,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;

  const stores = createDrizzlePartnersEtlStores(handle, ClockReal());

  return ok({
    ...stores,
    close: async () => handle.close(),
  });
};
