import { type Result, ok } from '../../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountStore,
  CedenteAccountStoreError,
} from '../../../application/ports/cedente-account-store.ts';

// Adapter in-memory do CedenteAccountStore (testes / boot sem DB). O adapter Drizzle + a tabela
// `fin_cedente_accounts` vêm na fatia FIN-CEDENTE-ACCOUNT-PERSIST.
export const createInMemoryCedenteAccountStore = (): CedenteAccountStore => {
  const accounts = new Map<string, CedenteAccount>();

  return {
    findById: async (
      id: CedenteAccountId,
    ): Promise<Result<CedenteAccount | null, CedenteAccountStoreError>> =>
      Promise.resolve(ok(accounts.get(id) ?? null)),

    save: async (account: CedenteAccount): Promise<Result<void, CedenteAccountStoreError>> => {
      accounts.set(account.id, account);
      return Promise.resolve(ok(undefined));
    },
  };
};
