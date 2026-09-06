import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { CedenteAccount } from '../../../domain/cedente/types.ts';
import type { CedenteAccountId } from '../../../domain/cedente/cedente-account-id.ts';
import type {
  CedenteAccountNaturalKey,
  CedenteAccountStore,
  CedenteAccountStoreError,
  NsaAllocationError,
} from '../../../application/ports/cedente-account-store.ts';
import { isActive } from '../../../domain/cedente/cedente-account.ts';
import * as NsaSequence from '../../../domain/cedente/nsa-sequence.ts';
import type { Nsa } from '../../../domain/cedente/nsa.ts';

// Adapter in-memory do CedenteAccountStore (testes / boot sem DB).
//
// `sequences` semeia o contador de um convênio — o equivalente ao que o backfill da migration faz em
// `fin_convenio_nsa`. Existe porque, com o dono da sequência fora da conta (#943), criar a conta
// deixou de ser caminho para posicionar o contador: um caso que precise partir de um número alto
// (faixa esgotada, por exemplo) não tem outro jeito de chegar lá senão emitir de um em um.
export const createInMemoryCedenteAccountStore = (
  options: Readonly<{ sequences?: Readonly<Record<string, number>> }> = {},
): CedenteAccountStore => {
  const accounts = new Map<string, CedenteAccount>();
  // A sequência de NSA por CONVÊNIO (#943) — espelha `fin_convenio_nsa`, e não a coluna da conta.
  const sequences = new Map<string, NsaSequence.ConvenioNsaSequence>(
    Object.entries(options.sequences ?? {}).map(([convenio, nextNsa]) => [
      convenio,
      { convenio, nextNsa },
    ]),
  );

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
    //
    // ⚠️ O espelho é PARCIAL, e de propósito: aqui "a linha existe?" se decide por `id`; no MySQL,
    // por QUALQUER índice único — o upsert real colide também na chave natural (FR-016). O segundo
    // caminho de lost update, o determinístico, não é reproduzível neste fake e por isso vive só em
    // `nsa-allocation.drizzle-mysql.test.ts`. Modelar a UNIQUE natural aqui seria reimplementar o
    // InnoDB no `Map` — o contrato compartilhado cobra o que os dois adapters honram, e só isso.
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
    //
    // ⚠️ O CONTADOR É DO CONVÊNIO (#943), e o fake tem de espelhar isso ou os testes ficam verdes
    // descrevendo o defeito. Enquanto ele guardava o número na conta, duas contas irmãs alocavam
    // `1` cada uma aqui dentro — exatamente o que quebrou em produção, e nada nesta suíte apontava.
    // A guarda de conta ativa vem ANTES de consumir o número, como no adapter real: conta encerrada
    // não queima NSA do convênio.
    allocateNsa: async (id: CedenteAccountId): Promise<Result<Nsa, NsaAllocationError>> => {
      const account = accounts.get(id);
      if (account === undefined) return Promise.resolve(err('cedente-account-not-found'));
      if (!isActive(account)) return Promise.resolve(err('cedente-account-not-active'));

      const convenio = account.convenio.trim();
      if (convenio === '') return Promise.resolve(err('cedente-account-not-found'));

      const allocation = NsaSequence.allocate(
        sequences.get(convenio) ?? NsaSequence.start(convenio),
      );
      if (!allocation.ok) return Promise.resolve(err('nsa-exhausted'));

      sequences.set(convenio, allocation.value.sequence);
      return Promise.resolve(ok(allocation.value.nsa));
    },
  };
};
