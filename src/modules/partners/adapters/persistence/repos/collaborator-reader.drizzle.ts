/**
 * Adapter Drizzle do `CollaboratorReader` (módulo partners) — LEITURA read-only.
 *
 *   - SELECT por id (limit 1) → reconstrói o agregado via `collaboratorFromRow` e projeta
 *     o read-record injetando `legacyId`/`createdAt`/`updatedAt` da row.
 *   - id inexistente → ok(null). Mapper-error (dado corrompido) → tratado como infra →
 *     err('collaborator-read-unavailable'). Boundary: try/catch → Result.
 *
 * ADR-0014: só lê `par_*` (nunca expõe row cru — devolve o read-record). ADR-0020: SELECT.
 * Zero escrita. Zero throw cruzando a borda.
 */

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  CollaboratorReader,
  CollaboratorReadRecord,
  CollaboratorReaderError,
} from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import { collaboratorFromRow } from '../mappers/collaborator.mapper.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

export const createDrizzleCollaboratorReader = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CollaboratorReader => {
  const { db, schema } = handle;

  const getById = async (
    id: CollaboratorId,
  ): Promise<Result<CollaboratorReadRecord | null, CollaboratorReaderError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parCollaborators)
        .where(eq(schema.parCollaborators.id, String(id)))
        .limit(1);
      const row = rows[0];
      if (row === undefined) return ok(null);
      const mapped = collaboratorFromRow(row);
      if (!mapped.ok) {
        process.stderr.write(`[partners-collaborator-reader:mapper] ${mapped.error}\n`);
        return err('collaborator-read-unavailable');
      }
      return ok({
        collaborator: mapped.value,
        legacyId: row.legacyId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    } catch (cause) {
      process.stderr.write(`[partners-collaborator-reader:getById] ${String(cause)}\n`);
      return err('collaborator-read-unavailable');
    }
  };

  const list = async (): Promise<
    Result<readonly CollaboratorReadRecord[], CollaboratorReaderError>
  > => {
    try {
      const rows = await db.select().from(schema.parCollaborators);
      const records: CollaboratorReadRecord[] = [];
      for (const row of rows) {
        const mapped = collaboratorFromRow(row);
        if (!mapped.ok) {
          process.stderr.write(`[partners-collaborator-reader:list-mapper] ${mapped.error}\n`);
          return err('collaborator-read-unavailable');
        }
        records.push({
          collaborator: mapped.value,
          legacyId: row.legacyId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        });
      }
      return ok(records);
    } catch (cause) {
      process.stderr.write(`[partners-collaborator-reader:list] ${String(cause)}\n`);
      return err('collaborator-read-unavailable');
    }
  };

  return { getById, list };
};
