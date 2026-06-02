// Adapter Drizzle de FinancierRepository (módulo partners).
//
//   - findById/findByCnpj/list: SELECT + mapper.
//   - save: SELECT-then-UPDATE-or-INSERT (ADR-0020 — sem ON DUPLICATE KEY).
//     UNIQUE `par_financiers_cnpj_idx` → ER_DUP_ENTRY (1062) → financier-cnpj-duplicate.
//
// ADR-0020: sem ODKU. ADR-0014: só par_*. Boundary: try/catch → Result (zero throw).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { Cnpj } from '#src/shared/kernel/cnpj.ts';
import type {
  FinancierRepository,
  FinancierRepositoryError,
} from '#src/modules/partners/domain/financier/repository.ts';
import type { Financier } from '#src/modules/partners/domain/financier/types.ts';
import type { FinancierId } from '#src/modules/partners/domain/financier/financier-id.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  financierToInsert,
  financierFromRow,
  type FinancierMapperError,
} from '../mappers/financier.mapper.ts';
import type { FinancierRow } from '../schemas/mysql.ts';

const isCnpjDupEntry = (e: unknown): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  for (const c of candidates) {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (
        obj['errno'] === 1062 &&
        typeof obj['sqlMessage'] === 'string' &&
        obj['sqlMessage'].includes('par_financiers_cnpj_idx')
      ) {
        return true;
      }
    }
  }
  return false;
};

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-financier-repo:${scope}] ${String(cause)}\n`);
};

// Mapper error em leitura = dado persistido corrompido → tratamos como infra.
const reconstruct = (row: Readonly<FinancierRow>): Result<Financier, FinancierRepositoryError> => {
  const mapped = financierFromRow(row);
  if (mapped.ok) return mapped;
  logRepo('mapper', mapped.error satisfies FinancierMapperError);
  return err('financier-repo-unavailable');
};

export const createDrizzleFinancierStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): FinancierRepository => {
  const { db, schema } = handle;
  const table = schema.parFinanciers;

  return {
    findById: async (id: FinancierId) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.id, id as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findById', cause);
        return err('financier-repo-unavailable');
      }
    },

    findByCnpj: async (cnpj: Cnpj) => {
      try {
        const rows = await db
          .select()
          .from(table)
          .where(eq(table.cnpj, cnpj as unknown as string))
          .limit(1);
        const row = rows[0];
        return row === undefined ? ok(null) : reconstruct(row);
      } catch (cause) {
        logRepo('findByCnpj', cause);
        return err('financier-repo-unavailable');
      }
    },

    list: async () => {
      try {
        const rows = await db.select().from(table);
        const out: Financier[] = [];
        for (const row of rows) {
          const mapped = reconstruct(row);
          if (!mapped.ok) return mapped;
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('list', cause);
        return err('financier-repo-unavailable');
      }
    },

    save: async (financier: Financier) => {
      const now = clock.now();
      const row = financierToInsert(financier, now);
      try {
        const existing = await db
          .select({ id: table.id })
          .from(table)
          .where(eq(table.id, row.id))
          .limit(1);

        if (existing.length > 0) {
          const { createdAt: _createdAt, ...rest } = row;
          await db
            .update(table)
            .set({ ...rest, updatedAt: now })
            .where(eq(table.id, row.id));
        } else {
          await db.insert(table).values(row);
        }
        return ok(undefined);
      } catch (cause) {
        if (isCnpjDupEntry(cause)) return err('financier-cnpj-duplicate');
        logRepo('save', cause);
        return err('financier-repo-unavailable');
      }
    },
  };
};
