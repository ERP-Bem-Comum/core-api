// Mapper CollaboratorHistory: row MySQL ↔ entry de domínio (#44).
//
//   - historyToInsert(entry, now): NewCollaboratorHistoryRow — achata a entry; `now` injetado em created_at.
//   - historyFromRow(row): Result<CollaboratorHistoryEntry, CollaboratorHistoryMapperError> — reidrata
//     ids (branded) e valida change_type (literal). Snapshots são text livre (sem validação).
//
// ADR-0020: change_type é varchar (sem ENUM). ADR-0014: só par_*. Zero throw na borda.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as CollaboratorHistoryId from '#src/modules/partners/domain/collaborator/collaborator-history-id.ts';
import {
  make,
  COLLABORATOR_CHANGE_TYPES,
} from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type {
  CollaboratorChangeType,
  CollaboratorHistoryEntry,
} from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { CollaboratorHistoryRow, NewCollaboratorHistoryRow } from '../schemas/mysql.ts';

export type CollaboratorHistoryMapperError =
  | 'collaborator-history-mapper-invalid-id'
  | 'collaborator-history-mapper-invalid-collaborator-ref'
  | 'collaborator-history-mapper-invalid-change-type';

const CHANGE_TYPES: ReadonlySet<string> = new Set<CollaboratorChangeType>(
  COLLABORATOR_CHANGE_TYPES,
);

export const historyToInsert = (
  entry: CollaboratorHistoryEntry,
  now: Date,
): NewCollaboratorHistoryRow => ({
  id: entry.id as unknown as string,
  collaboratorRef: entry.collaboratorRef as unknown as string,
  changeType: entry.changeType,
  snapshotBefore: entry.before,
  snapshotAfter: entry.after,
  changedByRef: entry.changedByRef,
  occurredAt: entry.occurredAt,
  createdAt: now,
});

export const historyFromRow = (
  row: Readonly<CollaboratorHistoryRow>,
): Result<CollaboratorHistoryEntry, CollaboratorHistoryMapperError> => {
  const id = CollaboratorHistoryId.rehydrate(row.id);
  if (!id.ok) return err('collaborator-history-mapper-invalid-id');

  const collaboratorRef = CollaboratorId.rehydrate(row.collaboratorRef);
  if (!collaboratorRef.ok) return err('collaborator-history-mapper-invalid-collaborator-ref');

  if (!CHANGE_TYPES.has(row.changeType)) {
    return err('collaborator-history-mapper-invalid-change-type');
  }

  return ok(
    make({
      id: id.value,
      collaboratorRef: collaboratorRef.value,
      changeType: row.changeType as CollaboratorChangeType,
      before: row.snapshotBefore,
      after: row.snapshotAfter,
      occurredAt: row.occurredAt,
      changedByRef: row.changedByRef,
    }),
  );
};
