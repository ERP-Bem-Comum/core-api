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

    // `next_nsa` FICA FORA do `set` do UPDATE, de propósito (correção de lost update em produção).
    // O contador tem UM caminho de escrita: `allocateNsa`, que serializa com `SELECT ... FOR UPDATE`
    // na mesma transação. Este `save` não o move — e são DOIS os caminhos que isso fecha:
    //
    // 1. Read-modify-write dos use cases (`edit-cedente-account.ts`, `close-cedente-account.ts`):
    //    ambos montam o objeto por spread de um `found` lido ANTES de qualquer alocação, sem tocar o
    //    contador. Uma alocação que completasse entre o `findById` e o `save` seria apagada. Envolver
    //    o `save` em transação NÃO resolve: o valor em mãos do use case já é obsoleto por construção,
    //    e relê-lo sob lock apenas moveria a corrida.
    //
    // 2. Colisão do upsert pela CHAVE NATURAL — e este é DETERMINÍSTICO, sem corrida nenhuma.
    //    `ON DUPLICATE KEY UPDATE` dispara em QUALQUER índice único, não só na PK, e a tabela tem
    //    `fin_cedente_accounts_natural_key_uq` (FR-016). Como `create-cedente-account.ts` faz
    //    check-then-insert (`findByNaturalKey` e depois `save`), recriar a MESMA conta bancária —
    //    duplo clique, ETL em paralelo — chega aqui como INSERT de id novo, e o banco o executa como
    //    UPDATE da linha que já existe. Com `next_nsa` no `set`, um contador em 57 voltaria a 1.
    //
    // Só há INSERT de fato quando nenhum UNIQUE colide; aí o contador nasce do snapshot, porque não
    // existe linha anterior — nem valor — a preservar.
    //
    // Em qualquer dos dois, o contador RETROCEDE e um NSA já emitido é reemitido — que o banco trata
    // como RETRANSMISSÃO, não como remessa nova. O que o layout exige do campo está no G018:
    // "evoluir um número seqüencial a cada header de arquivo" — retroceder viola isso. E o validador
    // do banco recusa o arquivo se o contador chegar a zero ("Número sequencial de arquivo está
    // zerado").
    //
    // Cobrado por `tests/modules/financial/adapters/persistence/cedente-account-store.contract.ts`
    // (caminho 1, nos dois adapters) e por `nsa-allocation.drizzle-mysql.test.ts` (caminho 2, que só
    // o MySQL reproduz: o fake decide "linha existe?" por id e nunca colide na chave natural).
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
              // ⚠️ ESTA LISTA É ESCRITA À MÃO, e o que falta nela some no UPDATE sem erro nenhum —
              // o `values(row)` acima grava a coluna no INSERT, então a conta NOVA sai certa e a
              // EDIÇÃO não. O use case devolve 200 com o dígito ecoado do agregado em memória
              // enquanto a coluna continua NULL, e a 058 fica em branco para sempre (#856).
              //
              // Coluna nova aqui é coluna nova nesta lista. `$inferInsert` torna coluna nullable
              // OPCIONAL no tipo, então o compilador não cobra a ausência — quem cobra é
              // `cedente-account-store.contract.ts`, que passou a conferir o UPDATE campo a campo.
              agencyDigit: row.agencyDigit,
              accountNumber: row.accountNumber,
              accountDigit: row.accountDigit,
              convenio: row.convenio,
              document: row.document,
              status: row.status,
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
