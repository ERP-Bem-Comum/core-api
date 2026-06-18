// Adapter Drizzle do CedenteAccountStore (MySQL). `save` = upsert por PK via ON DUPLICATE KEY UPDATE
// (ADR-0020 §"ON DUPLICATE KEY UPDATE permitido"); `findById` = SELECT por id.
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
// (.claude/rules/adapters.md §"converter para Result na borda").

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '#src/modules/financial/application/ports/cedente-account-store.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finCedenteAccounts } from '../schemas/mysql.ts';
import { toRow, toDomain } from '../mappers/cedente-account.mapper.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-cedente-account-store] ${op} failed: ${String(cause)}\n`);
};

export const createDrizzleCedenteAccountStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CedenteAccountStore => {
  const { db } = handle;

  return {
    findById: async (
      id: CedenteAccountId,
    ): Promise<Result<CedenteAccount | null, CedenteAccountStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finCedenteAccounts)
          .where(eq(finCedenteAccounts.id, id))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row);
        if (!mapped.ok) {
          logStore('findById:map', mapped.error);
          return err('cedente-account-store-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findById', cause);
        return err('cedente-account-store-unavailable');
      }
    },

    save: async (account: CedenteAccount): Promise<Result<void, CedenteAccountStoreError>> => {
      try {
        const row = toRow(account);
        await db
          .insert(finCedenteAccounts)
          .values(row)
          .onDuplicateKeyUpdate({
            set: {
              bankCode: row.bankCode,
              agency: row.agency,
              accountNumber: row.accountNumber,
              accountDigit: row.accountDigit,
              convenio: row.convenio,
              document: row.document,
              status: row.status,
              nextNsa: row.nextNsa,
            },
          });
        return ok(undefined);
      } catch (cause) {
        logStore('save', cause);
        return err('cedente-account-store-unavailable');
      }
    },
  };
};
