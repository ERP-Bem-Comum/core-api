/**
 * Adapter Drizzle do `FinancierReader` — LEITURA read-only. SELECT → `financierFromRow` +
 * projeta legacyId/createdAt/updatedAt. Espelha `supplier-reader.drizzle.ts`. ADR-0014/0020.
 */

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  FinancierReader,
  FinancierReadRecord,
  FinancierReaderError,
} from '#src/modules/partners/application/ports/financier-reader.ts';
import type { FinancierId } from '#src/modules/partners/domain/financier/financier-id.ts';
import { financierFromRow } from '../mappers/financier.mapper.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

export const createDrizzleFinancierReader = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): FinancierReader => {
  const { db, schema } = handle;

  const getById = async (
    id: FinancierId,
  ): Promise<Result<FinancierReadRecord | null, FinancierReaderError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parFinanciers)
        .where(eq(schema.parFinanciers.id, String(id)))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = financierFromRow(row);
      if (!mapped.ok) {
        process.stderr.write(`[partners-financier-reader:mapper] ${mapped.error}\n`);
        return err('financier-read-unavailable');
      }
      return ok({
        financier: mapped.value,
        legacyId: row.legacyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (cause) {
      process.stderr.write(`[partners-financier-reader:getById] ${String(cause)}\n`);
      return err('financier-read-unavailable');
    }
  };

  const list = async (): Promise<Result<readonly FinancierReadRecord[], FinancierReaderError>> => {
    try {
      const rows = await db.select().from(schema.parFinanciers);
      const records: FinancierReadRecord[] = [];
      for (const row of rows) {
        const mapped = financierFromRow(row);
        if (!mapped.ok) {
          process.stderr.write(`[partners-financier-reader:list-mapper] ${mapped.error}\n`);
          return err('financier-read-unavailable');
        }
        records.push({
          financier: mapped.value,
          legacyId: row.legacyId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return ok(records);
    } catch (cause) {
      process.stderr.write(`[partners-financier-reader:list] ${String(cause)}\n`);
      return err('financier-read-unavailable');
    }
  };

  return { getById, list };
};
