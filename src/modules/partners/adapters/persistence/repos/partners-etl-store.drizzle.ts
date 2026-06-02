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

// Serializacao defensiva para o stderr: Error -> message + errno/code/sqlMessage do mysql2 quando
// presentes; objeto -> JSON; resto -> String. (Evita o '[object Object]' default e mantem o
// errno/sqlMessage real legiveis no diagnostico.)
const describeCause = (cause: unknown): string => {
  if (cause instanceof Error) {
    const obj = cause as unknown as Record<string, unknown>;
    const errno = obj['errno'];
    const code = obj['code'];
    const sqlMessage = obj['sqlMessage'];
    const extras: string[] = [];
    if (typeof errno === 'number') extras.push(`errno=${errno}`);
    if (typeof code === 'string') extras.push(`code=${code}`);
    if (typeof sqlMessage === 'string') extras.push(`sqlMessage=${sqlMessage}`);
    return extras.length > 0 ? `${cause.message} (${extras.join(' ')})` : cause.message;
  }
  if (typeof cause === 'object' && cause !== null) {
    try {
      return JSON.stringify(cause);
    } catch {
      return Object.prototype.toString.call(cause);
    }
  }
  return String(cause);
};

const log = (ctx: string, cause: unknown): void => {
  // .cause carrega o errno/sqlMessage real do mysql2 embrulhado pelo DrizzleQueryError; sem ele o
  // diagnostico perde o errno. PII (valor duplicado no sqlMessage) e aceitavel SO no stderr efemero.
  const nested =
    cause instanceof Error && cause.cause !== undefined
      ? ` | cause: ${describeCause(cause.cause)}`
      : '';
  process.stderr.write(`[partners-etl-store:${ctx}] ${describeCause(cause)}${nested}\n`);
};

// Classe de erro de provision derivada do erro do mysql2 (eventualmente aninhado em .cause via
// DrizzleQueryError). PII-free: e um literal fixo, jamais o valor duplicado do sqlMessage.
export type ProvisionErrorClass = 'already-exists' | 'integrity-violation' | 'unavailable';

// Extrai o nome do indice citado por um ER_DUP_ENTRY (`... for key 'NOME'`), ou null.
const dupEntryIndexName = (cause: unknown): string | null => {
  const candidates: unknown[] = [cause];
  if (cause instanceof Error && cause.cause !== undefined) candidates.push(cause.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      const sqlMessage = obj['sqlMessage'];
      if (obj['errno'] === 1062 && typeof sqlMessage === 'string') {
        const match = /for key '([^']+)'/.exec(sqlMessage);
        if (match?.[1] !== undefined) return match[1];
      }
    }
  }
  return null;
};

// Classifica o erro de provision SEM tocar MySQL (testavel). Regras:
//   1062 em <legacyIdIndex>            -> 'already-exists'      (idempotencia ETL; preservado)
//   1062 em outra UNIQUE par_*_idx     -> 'integrity-violation' (dado do legado, NAO infra)
//   demais (nao-1062, PRIMARY, opaco)  -> 'unavailable'         (infra; conservador)
export const classifyProvisionError = (
  cause: unknown,
  legacyIdIndex: string,
): ProvisionErrorClass => {
  const indexName = dupEntryIndexName(cause);
  if (indexName === null) return 'unavailable';
  if (indexName === legacyIdIndex) return 'already-exists';
  // So UNIQUE secundarias de dado (par_<entidade>_<campo>_idx) sinalizam violacao de integridade;
  // PRIMARY ou indice nao-reconhecivel cai em 'unavailable' (conservador).
  if (indexName.startsWith('par_') && indexName.endsWith('_idx')) return 'integrity-violation';
  return 'unavailable';
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
  legacyIdIndex: string,
  body: () => Promise<ProvisionOutcome>,
): Promise<Result<ProvisionOutcome, PartnersEtlStoreError>> => {
  try {
    return ok(await body());
  } catch (cause) {
    const klass = classifyProvisionError(cause, legacyIdIndex);
    switch (klass) {
      case 'already-exists':
        return ok('already-exists');
      case 'integrity-violation':
        log(ctx, cause);
        return err('partners-etl-store-integrity-violation');
      case 'unavailable':
        log(ctx, cause);
        return err('partners-etl-store-unavailable');
    }
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
