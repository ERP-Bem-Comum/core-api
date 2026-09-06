// Adapter Drizzle do CedenteAccountStore (MySQL). `save` = upsert por PK via ON DUPLICATE KEY UPDATE
// (ADR-0020 §"ON DUPLICATE KEY UPDATE permitido"); `findById` = SELECT por id.
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
// (.claude/rules/adapters.md §"converter para Result na borda").

import { and, eq, ne } from 'drizzle-orm';
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
import { isActive } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as NsaSequence from '#src/modules/financial/domain/cedente/nsa-sequence.ts';
import * as Nsa from '#src/modules/financial/domain/cedente/nsa.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finCedenteAccounts, finConvenioNsa } from '../schemas/mysql.ts';
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
              // #995 B4 — a conta EXCLUÍDA não ocupa mais a chave. Sem este predicado, o
              // `createCedenteAccount` continuaria recusando o recadastro com
              // `cedente-account-duplicate`, e a exclusão não teria efeito nenhum sobre o cadastro.
              //
              // ⚠️ Duas guardas para o mesmo fato, e não é redundância: aqui é a régua de NEGÓCIO,
              // que decide o que o operador vê; a UNIQUE com `natural_key_slot` é a garantia no
              // BANCO, que impede duas linhas vivas mesmo se este `where` for reescrito errado.
              ne(finCedenteAccounts.status, 'Deleted'),
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

    // ⚠️ A EXCLUÍDA NÃO APARECE (#995, B4) — nem no grid, nem no filtro "Encerradas", que é servido
    // por esta mesma listagem. Ela continua alcançável por `findById`, e é assim que o histórico é
    // lido (B5): sair da lista não é sair do sistema.
    list: async (): Promise<Result<readonly CedenteAccount[], CedenteAccountStoreError>> => {
      try {
        const rows = await db
          .select()
          .from(finCedenteAccounts)
          .where(ne(finCedenteAccounts.status, 'Deleted'));
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
    // ⚠️ O LOCK É DA LINHA DO CONVÊNIO, não da conta (#943). A conta ainda diz QUAL convênio — por
    // isso o port continua recebendo `cedenteAccountId` —, mas quem tem o contador é o contrato
    // multipag: várias contas de pagamento sob o mesmo convênio compartilham uma sequência só.
    //
    // Enquanto o lock era da conta, duas contas irmãs não se serializavam entre si — cada uma
    // caminhava no próprio contador, ambas partindo de 1. O resultado não era uma corrida perdida:
    // era o número repetido POR DESENHO, que o banco lê como retransmissão e que o UNIQUE de
    // `your_number` recusava com 503 opaco (#942).
    //
    // A ORDEM DENTRO DA TRANSAÇÃO É REGRA, não arrumação: lê a conta e confere que ela paga ANTES
    // de tocar a sequência. Invertida, uma conta encerrada queimaria um número do convênio inteiro —
    // e o número não volta.
    allocateNsa: async (id: CedenteAccountId): Promise<Result<Nsa.Nsa, NsaAllocationError>> => {
      try {
        return await db.transaction(async (tx) => {
          // 1. A CONTA — sem lock: ela não é mais o recurso disputado, só a origem do convênio e a
          // dona da guarda de "pode pagar?".
          const accountRows = await tx
            .select()
            .from(finCedenteAccounts)
            .where(eq(finCedenteAccounts.id, id))
            .limit(1);

          const accountRow = accountRows[0];
          if (accountRow === undefined) return err('cedente-account-not-found');

          const account = toDomain(accountRow);
          if (!account.ok) {
            logStore('allocateNsa/toDomain', account.error);
            return err('cedente-account-store-unavailable');
          }

          if (!isActive(account.value)) return err('cedente-account-not-active');

          // Sem convênio não há sequência a que pertencer (CA6). A recusa nomeada vive em
          // `checkCedenteConvenio`, ANTES do NSA; chegar aqui com o campo vazio significa que um
          // chamador novo pulou a elegibilidade — e a PK da sequência não aceita string vazia como
          // identidade de contrato.
          const convenio = account.value.convenio.trim();
          if (convenio === '') return err('cedente-account-not-found');

          // 2. MATERIALIZA a linha da sequência ANTES de travá-la.
          //
          // ⚠️ ESTE INSERT NÃO É REDUNDANTE, e removê-lo traz de volta um DEADLOCK sob concorrência —
          // medido pelo CA3 da #943, que falhou com `cedente-account-store-unavailable` antes desta
          // linha existir. Em REPEATABLE READ (o default), um `SELECT … FOR UPDATE` que não encontra
          // linha trava o GAP, não uma linha: N transações do mesmo convênio novo pegam o mesmo gap,
          // todas seguem, e todas tentam inserir a mesma PK — `ER_LOCK_DEADLOCK`. É a mesma armadilha
          // que `.claude/rules/adapters.md` registra para o claim do outbox.
          //
          // Com a linha materializada primeiro, o `ON DUPLICATE KEY UPDATE` vira lock de LINHA na PK:
          // a segunda transação espera a primeira e depois enxerga o valor dela. O `set` é no-op de
          // propósito — quem move o contador é o UPDATE do passo 4, e escrever aqui sobrescreveria o
          // trabalho de quem chegou antes.
          await tx
            .insert(finConvenioNsa)
            .values({ convenio, nextNsa: Nsa.MIN })
            .onDuplicateKeyUpdate({ set: { convenio } });

          // 3. A SEQUÊNCIA — COM lock, e agora sobre uma linha que existe. É aqui que as contas irmãs
          // se serializam.
          const sequenceRows = await tx
            .select()
            .from(finConvenioNsa)
            .where(eq(finConvenioNsa.convenio, convenio))
            .for('update')
            .limit(1);

          const sequenceRow = sequenceRows[0];
          // Inalcançável: o INSERT acima garante a linha. Explícito porque a alternativa seria um
          // não-nulo assumido — e se um dia deixar de valer, o erro aqui é melhor que um NSA inventado.
          if (sequenceRow === undefined) {
            logStore('allocateNsa', 'sequência do convênio ausente após o insert');
            return err('cedente-account-store-unavailable');
          }

          const allocation = NsaSequence.allocate({
            convenio: sequenceRow.convenio,
            nextNsa: sequenceRow.nextNsa,
          });
          if (!allocation.ok) return err('nsa-exhausted');

          // 4. AVANÇA. Só aqui o contador se move, e sob o lock adquirido no passo 3.
          await tx
            .update(finConvenioNsa)
            .set({ nextNsa: allocation.value.sequence.nextNsa })
            .where(eq(finConvenioNsa.convenio, convenio));

          return ok(allocation.value.nsa);
        });
      } catch (cause) {
        logStore('allocateNsa', cause);
        return err('cedente-account-store-unavailable');
      }
    },
  };
};
