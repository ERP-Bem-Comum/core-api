// Adapter Drizzle do RejectedSuggestionRepository (fin_rejected_suggestions, migration 0006/#123).
// `save` é idempotente via ON DUPLICATE KEY UPDATE (UNIQUE (transaction_id, payable_id)) — ADR-0020.

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import type {
  RejectedSuggestionRepository,
  RejectedSuggestionRepositoryError,
  RejectSuggestionRecord,
} from '#src/modules/financial/application/ports/rejected-suggestion-repository.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finRejectedSuggestions } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-rejected-suggestion-repo] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzleRejectedSuggestionRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): RejectedSuggestionRepository => {
  const { db } = handle;

  return {
    save: async (
      record: RejectSuggestionRecord,
    ): Promise<Result<void, RejectedSuggestionRepositoryError>> => {
      try {
        await db
          .insert(finRejectedSuggestions)
          .values({
            id: newUuid(),
            transactionId: record.transactionId,
            payableId: record.payableId,
            rejectedAt: record.occurredAt,
            rejectedBy: record.rejectedBy,
          })
          .onDuplicateKeyUpdate({
            set: { rejectedAt: record.occurredAt, rejectedBy: record.rejectedBy },
          });
        return ok(undefined);
      } catch (cause) {
        logStore('save', cause);
        return err('rejected-suggestion-repository-failure');
      }
    },

    listByTransaction: async (
      transactionId: string,
    ): Promise<Result<ReadonlySet<string>, RejectedSuggestionRepositoryError>> => {
      try {
        const rows = await db
          .select({ payableId: finRejectedSuggestions.payableId })
          .from(finRejectedSuggestions)
          .where(eq(finRejectedSuggestions.transactionId, transactionId));
        return ok(new Set(rows.map((r) => r.payableId)));
      } catch (cause) {
        logStore('listByTransaction', cause);
        return err('rejected-suggestion-repository-failure');
      }
    },
  };
};
