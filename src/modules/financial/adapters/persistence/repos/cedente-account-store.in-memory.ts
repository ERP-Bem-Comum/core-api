import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountNaturalKey,
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../../../application/ports/cedente-account-store.ts';

// Adapter in-memory do CedenteAccountStore (testes / boot sem DB).
export const createInMemoryCedenteAccountStore = (): CedenteAccountStore => {
  const accounts = new Map<string, CedenteAccount>();

  return {
    findById: async (
      id: CedenteAccountId,
    ): Promise<Result<CedenteAccount | null, CedenteAccountStoreError>> =>
      Promise.resolve(ok(accounts.get(id) ?? null)),

    findByNaturalKey: async (
      key: CedenteAccountNaturalKey,
    ): Promise<Result<CedenteAccount | null, CedenteAccountStoreError>> => {
      for (const account of accounts.values()) {
        if (
          account.bankCode === key.bankCode &&
          account.agency === key.agency &&
          account.accountNumber === key.accountNumber &&
          account.accountDigit === key.accountDigit
        ) {
          return Promise.resolve(ok(account));
        }
      }
      return Promise.resolve(ok(null));
    },

    list: async (): Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>> =>
      Promise.resolve(ok([...accounts.values()])),

    save: async (account: CedenteAccount): Promise<Result<void, CedenteAccountStoreError>> => {
      accounts.set(account.id, account);
      return Promise.resolve(ok(undefined));
    },
  };
};
