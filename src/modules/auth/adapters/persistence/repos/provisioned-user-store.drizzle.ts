// Adapter Drizzle de ProvisionedUserStore (modulo auth) - persistencia ciente de legacy_id.
//
// Espelha user-repository.drizzle.ts, mas com semantica de INSERT idempotente (skip-by-legacy_id),
// NUNCA UPDATE (D17 — re-run nao sobrescreve senha ja resetada):
//   findByLegacyId: SELECT id WHERE legacy_id=? (auth_user_legacy_id_idx UNIQUE, type=const).
//   provision:      transacao — SELECT FOR UPDATE by legacy_id; se existe -> skip; senao
//                   INSERT auth_user (com legacy_id) + INSERT auth_user_role batch.
//                   ER_DUP_ENTRY em auth_user_legacy_id_idx (corrida) -> ok (idempotente);
//                   ER_DUP_ENTRY em auth_user_cpf_idx -> cpf-already-registered (o use case degrada).
//
// ADR-0020: sem ON DUPLICATE KEY. ADR-0014: so auth_*. Boundary: try/catch -> Result.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type {
  ProvisionedUserStore,
  ProvisionedUserStoreError,
} from '../../../application/ports/provisioned-user-store.ts';
import type { ActiveUser } from '../../../domain/identity/user/types.ts';
import type { UserId } from '../../../domain/identity/user-id.ts';
import * as UserIdNs from '../../../domain/identity/user-id.ts';
import type { Clock } from '../../../../../shared/ports/clock.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import { userToInsert } from '../mappers/user.mapper.ts';

// ER_DUP_ENTRY (1062) num indice nomeado. O errno sozinho nao diz QUAL unicidade quebrou, e as
// duas de auth_user que a ETL alcanca tem desfechos opostos: legacy_id -> idempotencia (skip),
// cpf -> dado a degradar. O nome do indice na sqlMessage e o que distingue.
const isDupEntryOn = (e: unknown, indexName: string): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (
        obj['errno'] === 1062 &&
        typeof obj['sqlMessage'] === 'string' &&
        obj['sqlMessage'].includes(indexName)
      ) {
        return true;
      }
    }
  }
  return false;
};

// Corrida de dois inserts no mesmo legacy_id -> idempotente (skip).
const isLegacyIdDupEntry = (e: unknown): boolean => isDupEntryOn(e, 'auth_user_legacy_id_idx');

// cpf legado que ja pertence a outro usuario (auth_user_cpf_idx, migration 0010).
const isCpfDupEntry = (e: unknown): boolean => isDupEntryOn(e, 'auth_user_cpf_idx');

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, ProvisionedUserStoreError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[provisioned-user-store:${ctx}] ${String(cause)}\n`);
    return err('provisioned-user-store-unavailable');
  }
};

export const createDrizzleProvisionedUserStore = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): ProvisionedUserStore => {
  const { db, schema } = handle;

  const findByLegacyId = async (
    legacyId: number,
  ): Promise<Result<UserId | null, ProvisionedUserStoreError>> =>
    safe('findByLegacyId', async () => {
      const rows = await db
        .select({ id: schema.authUser.id })
        .from(schema.authUser)
        .where(eq(schema.authUser.legacyId, legacyId));
      const row = rows[0];
      if (row === undefined) return null;
      const idR = UserIdNs.rehydrate(row.id);
      if (!idR.ok) throw new Error(`legacy_id ${legacyId}: user id corrompido (${row.id})`);
      return idR.value;
    });

  const provision = async (
    user: ActiveUser,
    legacyId: number,
  ): Promise<Result<void, ProvisionedUserStoreError>> => {
    const now = clock.now();
    const row = { ...userToInsert(user, now), legacyId };

    try {
      await db.transaction(async (tx) => {
        // SELECT FOR UPDATE por legacy_id: skip se ja migrado (idempotencia, sem UPDATE).
        const existing = await tx
          .select({ id: schema.authUser.id })
          .from(schema.authUser)
          .where(eq(schema.authUser.legacyId, legacyId))
          .for('update');

        if (existing.length > 0) return;

        await tx.insert(schema.authUser).values(row);

        if (user.roles.length > 0) {
          await tx.insert(schema.authUserRole).values(
            user.roles.map((role) => ({
              userId: row.id,
              roleId: role.id as unknown as string,
              assignedAt: now,
            })),
          );
        }
      });

      return ok(undefined);
    } catch (cause) {
      // Corrida: outro insert gravou o mesmo legacy_id antes -> idempotente.
      if (isLegacyIdDupEntry(cause)) return ok(undefined);
      // cpf ja pertence a outro usuario: erro NOMEADO, para o use case degradar o campo em vez
      // de perder o registro. Sem esta distincao, dado duplicado se disfarcaria de falha de infra
      // (`unavailable`) e o usuario legado nao seria migrado.
      if (isCpfDupEntry(cause)) return err('cpf-already-registered');
      process.stderr.write(`[provisioned-user-store:provision] ${String(cause)}\n`);
      return err('provisioned-user-store-unavailable');
    }
  };

  return { findByLegacyId, provision };
};
