/**
 * Adapter Drizzle do `ActReader` (módulo partners) — LEITURA read-only.
 * SELECT → `actFromRow` + projeta legacyId/createdAt/updatedAt. Espelha
 * `supplier-reader.drizzle.ts`. ADR-0014 (só `par_*`). ADR-0020 (SELECT). Zero throw na borda.
 */

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  ActReader,
  ActReadRecord,
  ActReaderError,
} from '#src/modules/partners/application/ports/act-reader.ts';
import type { ActId } from '#src/modules/partners/domain/act/act-id.ts';
import { actFromRow } from '../mappers/act.mapper.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

export const createDrizzleActReader = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): ActReader => {
  const { db, schema } = handle;

  const getById = async (id: ActId): Promise<Result<ActReadRecord | null, ActReaderError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parActs)
        .where(eq(schema.parActs.id, String(id)))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = actFromRow(row);
      if (!mapped.ok) {
        process.stderr.write(`[partners-act-reader:mapper] ${mapped.error}\n`);
        return err('act-read-unavailable');
      }
      return ok({
        act: mapped.value,
        legacyId: row.legacyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (cause) {
      process.stderr.write(`[partners-act-reader:getById] ${String(cause)}\n`);
      return err('act-read-unavailable');
    }
  };

  const list = async (): Promise<Result<readonly ActReadRecord[], ActReaderError>> => {
    try {
      const rows = await db.select().from(schema.parActs);
      const records: ActReadRecord[] = [];
      for (const row of rows) {
        const mapped = actFromRow(row);
        if (!mapped.ok) {
          process.stderr.write(`[partners-act-reader:list-mapper] ${mapped.error}\n`);
          return err('act-read-unavailable');
        }
        records.push({
          act: mapped.value,
          legacyId: row.legacyId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return ok(records);
    } catch (cause) {
      process.stderr.write(`[partners-act-reader:list] ${String(cause)}\n`);
      return err('act-read-unavailable');
    }
  };

  return { getById, list };
};
