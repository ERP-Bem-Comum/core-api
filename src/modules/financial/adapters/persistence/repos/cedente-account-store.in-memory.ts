import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountNaturalKey,
  CedenteAccountStore,
  CedenteAccountStoreError,
  NsaAllocationError,
} from '../../../application/ports/cedente-account-store.ts';
import { allocateNsa } from '../../../domain/cedente/cedente-account.ts';
import type { Nsa } from '../../../domain/cedente/nsa.ts';

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

    // `nextNsa` FICA FORA do path de update, espelhando a regra do adapter Drizzle (ver
    // `cedente-account-store.drizzle.ts` §`save`): o único caminho de escrita do contador é
    // `allocateNsa`. Se este `save` sobrescrevesse `nextNsa` com o valor que o chamador tem em mãos
    // (lido antes de uma alocação concorrente), o fake ficaria verde descrevendo produção errado —
    // que é justamente o lost update que este arquivo corrigiu.
    save: async (account: CedenteAccount): Promise<Result<void, CedenteAccountStoreError>> => {
      const existing = accounts.get(account.id);
      const toPersist =
        existing === undefined ? account : { ...account, nextNsa: existing.nextNsa };
      accounts.set(account.id, toPersist);
      return Promise.resolve(ok(undefined));
    },

    // Atômico por construção: o event loop não interrompe este corpo, que não tem `await` entre a
    // leitura e a escrita. É o comportamento OBSERVÁVEL do adapter real — mas a garantia dele vem
    // do lock de linha do InnoDB, e só o teste contra MySQL a prova. Um fake verde aqui não diz
    // nada sobre concorrência real.
    allocateNsa: async (id: CedenteAccountId): Promise<Result<Nsa, NsaAllocationError>> => {
      const account = accounts.get(id);
      if (account === undefined) return Promise.resolve(err('cedente-account-not-found'));

      const allocation = allocateNsa(account);
      if (!allocation.ok) return Promise.resolve(err(allocation.error));

      accounts.set(id, allocation.value.account);
      return Promise.resolve(ok(allocation.value.nsa));
    },
  };
};
