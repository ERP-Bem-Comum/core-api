/**
 * Adapter Drizzle do `SupplierReader` (módulo partners) — LEITURA read-only.
 * SELECT → `supplierFromRow` + projeta legacyId/createdAt/updatedAt. Espelha
 * `collaborator-reader.drizzle.ts`. ADR-0014 (só `par_*`). ADR-0020 (SELECT). Zero throw na borda.
 */

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  SupplierReader,
  SupplierReadRecord,
  SupplierReaderError,
} from '#src/modules/partners/application/ports/supplier-reader.ts';
import type { SupplierId } from '#src/modules/partners/domain/supplier/supplier-id.ts';
import { supplierFromRow } from '../mappers/supplier.mapper.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

export const createDrizzleSupplierReader = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): SupplierReader => {
  const { db, schema } = handle;

  const getById = async (
    id: SupplierId,
  ): Promise<Result<SupplierReadRecord | null, SupplierReaderError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parSuppliers)
        .where(eq(schema.parSuppliers.id, String(id)))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = supplierFromRow(row);
      if (!mapped.ok) {
        process.stderr.write(`[partners-supplier-reader:mapper] ${mapped.error}\n`);
        return err('supplier-read-unavailable');
      }
      return ok({
        supplier: mapped.value,
        legacyId: row.legacyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (cause) {
      process.stderr.write(`[partners-supplier-reader:getById] ${String(cause)}\n`);
      return err('supplier-read-unavailable');
    }
  };

  const list = async (): Promise<Result<readonly SupplierReadRecord[], SupplierReaderError>> => {
    try {
      const rows = await db.select().from(schema.parSuppliers);
      const records: SupplierReadRecord[] = [];
      for (const row of rows) {
        const mapped = supplierFromRow(row);
        if (!mapped.ok) {
          process.stderr.write(`[partners-supplier-reader:list-mapper] ${mapped.error}\n`);
          return err('supplier-read-unavailable');
        }
        records.push({
          supplier: mapped.value,
          legacyId: row.legacyId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return ok(records);
    } catch (cause) {
      process.stderr.write(`[partners-supplier-reader:list] ${String(cause)}\n`);
      return err('supplier-read-unavailable');
    }
  };

  return { getById, list };
};
