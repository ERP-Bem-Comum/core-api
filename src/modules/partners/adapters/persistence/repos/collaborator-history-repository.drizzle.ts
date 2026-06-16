// Adapter Drizzle de CollaboratorHistoryRepository (append-only) — #44.
//
//   - append: INSERT em par_collaborator_history (sem ODKU — append puro). try/catch → Result.
//
// ADR-0020: só INSERT (sem update/delete). ADR-0014: só par_*. Boundary: zero throw.

import process from 'node:process';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { CollaboratorHistoryRepository } from '#src/modules/partners/domain/collaborator/collaborator-history-repository.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import { historyToInsert } from '../mappers/collaborator-history.mapper.ts';

const logRepo = (scope: string, cause: unknown): void => {
  process.stderr.write(`[partners-collaborator-history-repo:${scope}] ${String(cause)}\n`);
};

export const createDrizzleCollaboratorHistoryStore = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  clock: Clock,
): CollaboratorHistoryRepository => {
  const { db, schema } = handle;
  const table = schema.parCollaboratorHistory;

  return {
    append: async (entry) => {
      try {
        await db.insert(table).values(historyToInsert(entry, clock.now()));
        return ok(undefined);
      } catch (cause) {
        logRepo('append', cause);
        return err('collaborator-repo-unavailable');
      }
    },
  };
};
