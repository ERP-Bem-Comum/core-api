// Adapter Drizzle do CedenteAccountStore (MySQL). `save` = upsert por PK via ON DUPLICATE KEY UPDATE
// (ADR-0020 §"ON DUPLICATE KEY UPDATE permitido"); `findById` = SELECT por id.
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
// (.claude/rules/adapters.md §"converter para Result na borda").

import { and, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { CedenteAccount } from '#src/modules/financial/domain/cedente/types.ts';
import type { CedenteAccountId } from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountNaturalKey,
  CedenteAccountStore,
  CedenteAccountStoreError,
  NsaAllocationError,
} from '#src/modules/financial/application/ports/cedente-account-store.ts';
import { allocateNsa as allocateNsaOf } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import type { Nsa } from '#src/modules/financial/domain/cedente/nsa.ts';
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

    findByNaturalKey: async (
      key: CedenteAccountNaturalKey,
    ): Promise<Result<CedenteAccount | null, CedenteAccountStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finCedenteAccounts)
          .where(
            and(
              eq(finCedenteAccounts.bankCode, key.bankCode),
              eq(finCedenteAccounts.agency, key.agency),
              eq(finCedenteAccounts.accountNumber, key.accountNumber),
              eq(finCedenteAccounts.accountDigit, key.accountDigit),
            ),
          )
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row);
        if (!mapped.ok) {
          logStore('findByNaturalKey:map', mapped.error);
          return err('cedente-account-store-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logStore('findByNaturalKey', cause);
        return err('cedente-account-store-unavailable');
      }
    },

    list: async (): Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>> => {
      try {
        const rows = await db.select().from(finCedenteAccounts);
        const accounts: CedenteAccount[] = [];
        for (const row of rows) {
          const mapped = toDomain(row);
          if (!mapped.ok) {
            logStore('list:map', mapped.error);
            return err('cedente-account-store-unavailable');
          }
          accounts.push(mapped.value);
        }
        return ok(accounts);
      } catch (cause) {
        logStore('list', cause);
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
              type: row.type,
              nickname: row.nickname,
              bankName: row.bankName,
              openingBalanceCents: row.openingBalanceCents,
              openingBalanceDate: row.openingBalanceDate,
            },
          });
        return ok(undefined);
      } catch (cause) {
        logStore('save', cause);
        return err('cedente-account-store-unavailable');
      }
    },

    // Alocação de NSA: SELECT ... FOR UPDATE + UPDATE na MESMA transação.
    //
    // O `.for('update')` adquire lock de linha (Refman §15.7.2.4): uma segunda transação que peça
    // o mesmo NSA fica bloqueada até esta terminar, e então lê o valor JÁ incrementado. Sem o lock,
    // duas remessas concorrentes leriam o mesmo número — e o banco trata NSA repetido como
    // RETRANSMISSÃO, não como remessa nova. É o defeito mais caro que este adapter pode ter, e é
    // por isso que a operação não é composição de `findById` + `save` no use case.
    //
    // A decisão de negócio continua no domínio: este método só empresta a serialização.
    allocateNsa: async (id: CedenteAccountId): Promise<Result<Nsa, NsaAllocationError>> => {
      try {
        return await db.transaction(async (tx) => {
          const rows = await tx
            .select()
            .from(finCedenteAccounts)
            .where(eq(finCedenteAccounts.id, id))
            .for('update')
            .limit(1);

          const row = rows[0];
          if (row === undefined) return err('cedente-account-not-found');

          const account = toDomain(row);
          if (!account.ok) {
            logStore('allocateNsa/toDomain', account.error);
            return err('cedente-account-store-unavailable');
          }

          const allocation = allocateNsaOf(account.value);
          if (!allocation.ok) return err(allocation.error);

          await tx
            .update(finCedenteAccounts)
            .set({ nextNsa: allocation.value.account.nextNsa })
            .where(eq(finCedenteAccounts.id, id));

          return ok(allocation.value.nsa);
        });
      } catch (cause) {
        logStore('allocateNsa', cause);
        return err('cedente-account-store-unavailable');
      }
    },
  };
};
