// Adapter Drizzle do CollaboratorHistoryReader (LEITURA read-only) — #44.
//
//   - listByCollaborator: SELECT WHERE collaborator_ref = ? ORDER BY occurred_at DESC + mapper.
//     Mapper-error (dado corrompido) → tratado como infra → collaborator-repo-unavailable.
//
// ADR-0014: só lê par_*. ADR-0020: SELECT. Zero escrita, zero throw cruzando a borda.

import { eq, desc } from 'drizzle-orm';
import process from 'node:process';

import { ok, err } from '#src/shared/primitives/result.ts';
import type {
  CollaboratorHistoryReader,
  CollaboratorHistoryReaderError,
} from '#src/modules/partners/application/ports/collaborator-history-reader.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import { historyFromRow } from '../mappers/collaborator-history.mapper.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

export const createDrizzleCollaboratorHistoryReader = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CollaboratorHistoryReader => {
  const { db, schema } = handle;
  const table = schema.parCollaboratorHistory;

  const listByCollaborator = async (
    id: CollaboratorId,
  ): Promise<Result<readonly CollaboratorHistoryEntry[], CollaboratorHistoryReaderError>> => {
    try {
      const rows = await db
        .select()
        .from(table)
        .where(eq(table.collaboratorRef, String(id)))
        .orderBy(desc(table.occurredAt));
      const entries: CollaboratorHistoryEntry[] = [];
      for (const row of rows) {
        const mapped = historyFromRow(row);
        if (!mapped.ok) {
          process.stderr.write(`[partners-collaborator-history-reader:mapper] ${mapped.error}\n`);
          return err('collaborator-repo-unavailable');
        }
        entries.push(mapped.value);
      }
      return ok(entries);
    } catch (cause) {
      process.stderr.write(`[partners-collaborator-history-reader:list] ${String(cause)}\n`);
      return err('collaborator-repo-unavailable');
    }
  };

  return { listByCollaborator };
};
