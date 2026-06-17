/**
 * Adapter Drizzle do `CollaboratorHistoryRepository` (US4) — audit trail em `par_collaborator_history`.
 *
 *   - `record`: materializa o diff (buildHistoryEntries) e INSERE as linhas. Diff vazio → no-op.
 *   - `listByCollaborator`: SELECT por colaborador, ordenado por `occurred_at` (índice cobre).
 *
 * ADR-0014: só `par_*`. ADR-0020: INSERT/SELECT. Boundary: try/catch → Result; zero throw cruzando.
 */

import { asc, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { buildHistoryEntries } from '../mappers/collaborator-history.mapper.ts';
import type {
  CollaboratorHistoryEntry,
  CollaboratorHistoryError,
  CollaboratorHistoryEventType,
  CollaboratorHistoryRepository,
  RecordHistoryInput,
} from '#src/modules/partners/application/ports/collaborator-history.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';

export const createDrizzleCollaboratorHistory = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CollaboratorHistoryRepository => {
  const { db, schema } = handle;

  const record = async (
    input: RecordHistoryInput,
  ): Promise<Result<void, CollaboratorHistoryError>> => {
    const entries = buildHistoryEntries(input);
    if (entries.length === 0) return ok(undefined);
    try {
      await db.insert(schema.parCollaboratorHistory).values(entries.map((e) => ({ ...e })));
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[partners-collaborator-history:record] ${String(cause)}\n`);
      return err('collaborator-repo-unavailable');
    }
  };

  const listByCollaborator = async (
    collaboratorId: string,
  ): Promise<Result<readonly CollaboratorHistoryEntry[], CollaboratorHistoryError>> => {
    try {
      const rows = await db
        .select()
        .from(schema.parCollaboratorHistory)
        .where(eq(schema.parCollaboratorHistory.collaboratorId, collaboratorId))
        .orderBy(asc(schema.parCollaboratorHistory.occurredAt));
      return ok(
        rows.map((row) => ({
          id: row.id,
          collaboratorId: row.collaboratorId,
          eventType: row.eventType as CollaboratorHistoryEventType,
          fieldName: row.fieldName,
          fieldLabel: row.fieldLabel,
          valueBefore: row.valueBefore,
          valueAfter: row.valueAfter,
          occurredAt: row.occurredAt,
        })),
      );
    } catch (cause) {
      process.stderr.write(`[partners-collaborator-history:list] ${String(cause)}\n`);
      return err('collaborator-repo-unavailable');
    }
  };

  return { record, listByCollaborator };
};
