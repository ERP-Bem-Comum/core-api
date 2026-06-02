// Adapters Drizzle dos LegacyEntityStore das 4 entidades par_* (modulo partners).
//
// Persistencia ciente de legacy_id para a ETL (PARTNERS-ETL-WRITE-PORT). Semantica de INSERT
// idempotente (skip-by-legacy_id), NUNCA UPDATE (re-run nao sobrescreve):
//   findByLegacyId: SELECT pk WHERE legacy_id=? (par_<x>_legacy_id_idx UNIQUE, type=const).
//   provision:      transacao — SELECT FOR UPDATE by legacy_id; se existe -> skip ('already-exists');
//                   senao INSERT { ...<x>ToInsert(aggregate, now), legacyId } ('created').
//                   ER_DUP_ENTRY em par_<x>_legacy_id_idx (corrida) -> 'already-exists'.
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so par_*. Boundary: try/catch -> Result.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  LegacyEntityStore,
  PartnersEtlStoreError,
  ProvisionOutcome,
} from '../../../application/ports/legacy-entity-store.ts';
import type { Clock } from '../../../../../shared/ports/clock.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import * as SupplierId from '../../../domain/supplier/supplier-id.ts';
import * as FinancierId from '../../../domain/financier/financier-id.ts';
import * as CollaboratorId from '../../../domain/collaborator/collaborator-id.ts';
import * as UserRef from '../../../../../shared/kernel/user-ref.ts';
import type { Supplier } from '../../../domain/supplier/types.ts';
import type { Financier } from '../../../domain/financier/types.ts';
import type { Collaborator } from '../../../domain/collaborator/types.ts';
import type { UserProfile } from '../../../domain/user-profile/types.ts';
import { supplierToInsert } from '../mappers/supplier.mapper.ts';
import { financierToInsert } from '../mappers/financier.mapper.ts';
import { collaboratorToInsert } from '../mappers/collaborator.mapper.ts';
import { userProfileToInsert } from '../mappers/user-profile.mapper.ts';

const log = (ctx: string, cause: unknown): void => {
  process.stderr.write(`[partners-etl-store:${ctx}] ${String(cause)}\n`);
};

// ER_DUP_ENTRY no indice de legacy_id da entidade: corrida de dois inserts -> idempotente.
const isLegacyDupEntry = (e: unknown, dupIndex: string): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (
        obj['errno'] === 1062 &&
        typeof obj['sqlMessage'] === 'string' &&
        obj['sqlMessage'].includes(dupIndex)
      ) {
        return true;
      }
    }
  }
  return false;
};

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, PartnersEtlStoreError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    log(ctx, cause);
    return err('partners-etl-store-unavailable');
  }
};

const runProvision = async (
  ctx: string,
  dupIndex: string,
  body: () => Promise<ProvisionOutcome>,
): Promise<Result<ProvisionOutcome, PartnersEtlStoreError>> => {
  try {
    return ok(await body());
  } catch (cause) {
    if (isLegacyDupEntry(cause, dupIndex)) return ok('already-exists');
    log(ctx, cause);
    return err('partners-etl-store-unavailable');
  }
};

export const createDrizzlePartnersEtlStores = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): Readonly<{
  suppliers: LegacyEntityStore<Supplier, SupplierId.SupplierId>;
  financiers: LegacyEntityStore<Financier, FinancierId.FinancierId>;
  collaborators: LegacyEntityStore<Collaborator, CollaboratorId.CollaboratorId>;
  userProfiles: LegacyEntityStore<UserProfile, UserRef.UserRef>;
}> => {
  const { db, schema } = handle;

  const suppliers: LegacyEntityStore<Supplier, SupplierId.SupplierId> = {
    findByLegacyId: async (legacyId) =>
      safe('suppliers.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.parSuppliers.id })
          .from(schema.parSuppliers)
          .where(eq(schema.parSuppliers.legacyId, legacyId));
        const row = rows[0];
        if (row === undefined) return null;
        const ref = SupplierId.rehydrate(row.id);
        if (!ref.ok) throw new Error(`legacy_id ${legacyId}: id corrompido (${row.id})`);
        return ref.value;
      }),
    provision: async (supplier, legacyId) =>
      runProvision('suppliers.provision', 'par_suppliers_legacy_id_idx', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.parSuppliers.id })
            .from(schema.parSuppliers)
            .where(eq(schema.parSuppliers.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx
            .insert(schema.parSuppliers)
            .values({ ...supplierToInsert(supplier, clock.now()), legacyId });
        });
        return outcome;
      }),
  };

  const financiers: LegacyEntityStore<Financier, FinancierId.FinancierId> = {
    findByLegacyId: async (legacyId) =>
      safe('financiers.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.parFinanciers.id })
          .from(schema.parFinanciers)
          .where(eq(schema.parFinanciers.legacyId, legacyId));
        const row = rows[0];
        if (row === undefined) return null;
        const ref = FinancierId.rehydrate(row.id);
        if (!ref.ok) throw new Error(`legacy_id ${legacyId}: id corrompido (${row.id})`);
        return ref.value;
      }),
    provision: async (financier, legacyId) =>
      runProvision('financiers.provision', 'par_financiers_legacy_id_idx', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.parFinanciers.id })
            .from(schema.parFinanciers)
            .where(eq(schema.parFinanciers.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx
            .insert(schema.parFinanciers)
            .values({ ...financierToInsert(financier, clock.now()), legacyId });
        });
        return outcome;
      }),
  };

  const collaborators: LegacyEntityStore<Collaborator, CollaboratorId.CollaboratorId> = {
    findByLegacyId: async (legacyId) =>
      safe('collaborators.findByLegacyId', async () => {
        const rows = await db
          .select({ id: schema.parCollaborators.id })
          .from(schema.parCollaborators)
          .where(eq(schema.parCollaborators.legacyId, legacyId));
        const row = rows[0];
        if (row === undefined) return null;
        const ref = CollaboratorId.rehydrate(row.id);
        if (!ref.ok) throw new Error(`legacy_id ${legacyId}: id corrompido (${row.id})`);
        return ref.value;
      }),
    provision: async (collaborator, legacyId) =>
      runProvision('collaborators.provision', 'par_collaborators_legacy_id_idx', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: schema.parCollaborators.id })
            .from(schema.parCollaborators)
            .where(eq(schema.parCollaborators.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx
            .insert(schema.parCollaborators)
            .values({ ...collaboratorToInsert(collaborator, clock.now()), legacyId });
        });
        return outcome;
      }),
  };

  const userProfiles: LegacyEntityStore<UserProfile, UserRef.UserRef> = {
    findByLegacyId: async (legacyId) =>
      safe('userProfiles.findByLegacyId', async () => {
        const rows = await db
          .select({ userRef: schema.parUserProfiles.userRef })
          .from(schema.parUserProfiles)
          .where(eq(schema.parUserProfiles.legacyId, legacyId));
        const row = rows[0];
        if (row === undefined) return null;
        const ref = UserRef.rehydrate(row.userRef);
        if (!ref.ok) throw new Error(`legacy_id ${legacyId}: user_ref corrompido (${row.userRef})`);
        return ref.value;
      }),
    provision: async (profile, legacyId) =>
      runProvision('userProfiles.provision', 'par_user_profiles_legacy_id_idx', async () => {
        let outcome: ProvisionOutcome = 'created';
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ userRef: schema.parUserProfiles.userRef })
            .from(schema.parUserProfiles)
            .where(eq(schema.parUserProfiles.legacyId, legacyId))
            .for('update');
          if (existing.length > 0) {
            outcome = 'already-exists';
            return;
          }
          await tx
            .insert(schema.parUserProfiles)
            .values({ ...userProfileToInsert(profile, clock.now()), legacyId });
        });
        return outcome;
      }),
  };

  return { suppliers, financiers, collaborators, userProfiles };
};
