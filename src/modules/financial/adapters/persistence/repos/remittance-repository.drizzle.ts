// Adapter Drizzle do RemittanceRepository (MySQL).
//
// Boundary: todo try/catch converte para Result; nenhum Error cruza a borda
// (.claude/rules/adapters.md §"converter para Result na borda").
import { eq, inArray, and, desc, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  Remittance,
  RemittancePayable,
  RemittanceStatus,
} from '#src/modules/financial/domain/remittance/types.ts';
import type { RemittanceEvent } from '#src/modules/financial/domain/remittance/events.ts';
import * as RemittanceId from '#src/modules/financial/domain/remittance/remittance-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import type {
  RemittanceRepository,
  RemittanceRepositoryError,
  RemittanceSaveError,
} from '#src/modules/financial/application/ports/remittance-repository.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finRemittances, finRemittancePayables, finPayables } from '../schemas/mysql.ts';
import { appendFinOutboxInTx } from './fin-outbox-helpers.ts';
import type { FinRemittanceRow } from '../schemas/mysql.ts';

const logRepo = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-remittance-repository] ${op} failed: ${String(cause)}\n`);
};

// Sentinela da reserva perdida (#789): o `catch` precisa distinguir "perdi a corrida" — desfecho
// ESPERADO sob concorrência — de "o banco caiu", e faz isso por identidade (`===`), não por
// mensagem, que refatoração muda sem avisar.
//
// Instância única e `Error` de verdade, por duas restrições que se somam: `@typescript-eslint/
// only-throw-error` recusa lançar símbolo, e `class` é barrada neste repositório, então `instanceof`
// de um tipo próprio está fora. Uma constante compartilhada resolve as duas.
//
// ⚠️ O `stack` dela aponta para a carga deste módulo, não para o ponto do `throw` — o preço de ser
// singleton. É inofensivo porque ela nunca é logada nem propagada: o `catch` a intercepta e a
// traduz. Se algum dia ela precisar viajar, troque por uma factory que crie o `Error` na hora.
//
// Sobrevive ao trajeto porque o driver relança o objeto original: `mysql2/session.js` roda o
// ROLLBACK no `catch` e faz `throw err` do mesmo valor, sem empacotar.
const PAYABLES_ALREADY_HELD = new Error('remittance-payables-already-held');

// ─── Tradução de instante entre o domínio e a coluna `datetime` ──────────────────────────────────
//
// O domínio guarda instante como STRING ISO 8601 UTC (`2026-08-18T15:01:24.615Z`) — é o que
// `generate-remittance.ts` produz com `toISOString()`, e o que o agente publica em `executadoEm`.
// A coluna é `datetime(3)` com `mode: 'string'`, e nesse modo o Drizzle repassa a string CRUA ao
// driver: o MySQL recebe o `T` e o `Z` e recusa com **1292** (`Incorrect datetime value`).
//
// Medido contra MySQL 8.4 real:
//
//   INSERT INTO t VALUES ('2026-08-19T10:00:00.000Z');
//   ERROR 1292 (22007): Incorrect datetime value: '2026-08-19T10:00:00.000Z' for column 'd'
//
// ⚠️ Consequência antes desta correção: **`POST /financial/remittances` nunca funcionou contra banco
// real** — toda geração morria em `remittance-persist-failed` (503). O caminho só passava no repo
// in-memory.
//
// E a suíte de integração ficava VERDE, porque a fixture escrevia `'2026-08-11 14:00:00.000'` à mão
// — formato do MySQL, que o use case não produz. Teste alimentado com dado que a aplicação nunca
// gera não prova o caminho da aplicação: prova outro caminho. A fixture foi corrigida junto.
//
// A conversão fica AQUI porque o formato é do MySQL, não do domínio: quem conhece o dialeto é o
// adapter (ADR-0006). `datetime` não guarda fuso, então ida e volta são ambas em UTC — o instante
// gravado é o mesmo que se lê, independente do `time_zone` da sessão.
const pad = (value: number, width = 2): string => String(value).padStart(width, '0');

// Exportadas para teste: são as duas regras que decidem se um pagamento consegue ser gravado, e a
// suíte de integração só as exercita sob `MYSQL_INTEGRATION=1`. Sem cobertura no gate rápido, a
// regressão volta a aparecer no ambiente, não no CI.
export const toMysqlDateTime = (iso: string): string => {
  const at = new Date(iso);
  // String que não é instante reconhecível segue CRUA, de propósito: falhar no banco é melhor que
  // gravar silenciosamente um valor inventado numa coluna que decide quando um pagamento saiu.
  if (Number.isNaN(at.getTime())) return iso;
  return (
    `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())} ` +
    `${pad(at.getUTCHours())}:${pad(at.getUTCMinutes())}:${pad(at.getUTCSeconds())}.` +
    pad(at.getUTCMilliseconds(), 3)
  );
};

// Volta ao ISO que o domínio (e o contrato HTTP) espera. Sem isto, a leitura devolveria
// `2026-08-18 15:01:24.615`, que `Date` não parseia de forma portável entre browsers.
export const toIsoDateTime = (stored: string): string =>
  stored.includes('T') ? stored : `${stored.replace(' ', 'T')}Z`;

// Estados que PRENDEM o documento. `Discarded` fica de fora — é o único que devolve o documento
// para a fila, e exige decisão humana. Espelha `holdsDocuments` do domínio; a lista está aqui
// porque o filtro precisa ir para o SQL, não para a memória.
const HOLDING: readonly RemittanceStatus[] = ['Queued', 'Transmitted', 'Failed'];

const toDomain = (
  row: Readonly<FinRemittanceRow>,
  payables: readonly RemittancePayable[],
): Result<Remittance, 'remittance-row-invalid'> => {
  const id = RemittanceId.rehydrate(row.id);
  if (!id.ok) return err('remittance-row-invalid');

  const cedenteAccountId = CedenteAccountId.rehydrate(row.cedenteAccountId);
  if (!cedenteAccountId.ok) return err('remittance-row-invalid');

  return ok({
    id: id.value,
    cedenteAccountId: cedenteAccountId.value,
    nsa: row.nsa,
    fileName: row.fileName,
    contentHash: row.contentHash,
    payables,
    status: row.status as RemittanceStatus,
    generatedAt: toIsoDateTime(row.generatedAt),
    ...(row.settledAt !== null ? { settledAt: toIsoDateTime(row.settledAt) } : {}),
    ...(row.detail !== null ? { detail: row.detail } : {}),
  });
};

export const createDrizzleRemittanceRepository = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): RemittanceRepository => {
  const { db } = handle;

  // A ordenação por `payableId` é deliberada e independe da ordem de emissão: o agregado não
  // promete ordem, e uma leitura estável é o que torna a comparação em teste previsível. A ordem da
  // emissão está preservada onde ela importa — dentro da própria referência, que carrega a posição.
  //
  // Ordenar por `documentId` não serviria: títulos irmãos compartilham a nota, e o desempate entre
  // eles ficaria a cargo do otimizador.
  const loadPayables = async (remittanceId: string): Promise<readonly RemittancePayable[]> => {
    const rows = await db
      .select({
        payableId: finRemittancePayables.payableId,
        documentId: finRemittancePayables.documentId,
        yourNumber: finRemittancePayables.yourNumber,
      })
      .from(finRemittancePayables)
      .where(eq(finRemittancePayables.remittanceId, remittanceId));
    return rows
      .map((r) => ({
        payableId: r.payableId,
        documentId: r.documentId,
        yourNumber: r.yourNumber,
      }))
      .sort((a, b) => a.payableId.localeCompare(b.payableId));
  };

  return {
    // Cabeçalho e vínculos na MESMA transação: uma remessa sem seus documentos não prenderia nada,
    // e é justamente o vínculo que impede a segunda inclusão. Meia gravação aqui reabre o caminho
    // para pagamento em dobro.
    //
    // SELECT ... FOR UPDATE + UPDATE-ou-INSERT, NUNCA `ON DUPLICATE KEY UPDATE` (ADR-0020
    // §"Padrão de upsert"). O ODKU dispara em QUALQUER UNIQUE violada, não só na PK: uma remessa
    // NOVA com NSA já usado na conta cairia no ramo de update e SOBRESCREVERIA o status da remessa
    // existente — que pode estar `Transmitted`. O UNIQUE deixaria de recusar, e uma remessa já
    // enviada passaria a constar com o desfecho de outra. Foi exatamente esse defeito que o teste
    // de integração pegou.
    save: async (
      remittance: Remittance,
      events: readonly RemittanceEvent[] = [],
    ): Promise<Result<void, RemittanceSaveError>> => {
      try {
        await db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: finRemittances.id })
            .from(finRemittances)
            .where(eq(finRemittances.id, remittance.id))
            .for('update');

          if (existing[0] === undefined) {
            // ─── Reserva dos títulos (#789) ─────────────────────────────────────────────────
            //
            // `findHeldPayableIds`, no use case, responde sobre o PASSADO: entre a resposta dela e
            // esta transação cabe a tradução CNAB inteira. Duas emissões concorrentes leem "livre"
            // antes de qualquer uma gravar, e ambas gravam — o mesmo título em duas remessas, que é
            // pagamento em dobro (CWE-367). A PK composta `(remittance_id, payable_id)` não recusa:
            // remessas distintas são chaves distintas.
            //
            // E nenhuma UNIQUE pode recusar, porque a invariante é CONDICIONAL — "não estar em duas
            // remessas VIVAS", com `Discarded` devolvendo o título — e o MySQL não tem índice
            // parcial. Sem constraint possível, a exclusão tem de vir de lock.
            //
            // ⚠️ O lock é sobre `fin_payables`, cujas linhas EXISTEM, e não sobre
            // `fin_remittance_payables`, cujas linhas ainda não existem. A diferença decide o
            // resultado: busca por PK (índice único, condição de igualdade) trava só o registro —
            // *"For a unique index with a unique search condition, InnoDB locks only the index
            // record found, not the gap before it"* (Refman 8.4 §17.7.3) —, e X↔X conflita, então a
            // segunda transação ESPERA. Travar a tabela de vínculo pegaria GAP lock, e gap locks
            // *"can co-exist (…) do not conflict with each other"* (§17.7.1): as duas passariam, e
            // só colidiriam no INSERT via insert-intention — deadlock 1213 em vez de espera.
            //
            // Efeito colateral que importa: por não depender de gap, esta trava sobrevive a
            // READ COMMITTED, que desliga gap locking. Uma proteção contra pagamento em dobro não
            // pode depender de um parâmetro que alguém troca sem saber o que derruba.
            //
            // Não é preciso ordenar os ids: `IN (…)` sobre um índice único é range condition
            // normalizada pelo otimizador — *"its output does not depend on the order in which
            // conditions appear in WHERE clause"* (§10.2.1.2) —, e a varredura segue a ordem da
            // chave. As duas transações adquirem os locks na mesma ordem por construção do MySQL,
            // não por disciplina daqui.
            const payableIds = remittance.payables.map((p) => p.payableId);
            await tx
              .select({ id: finPayables.id })
              .from(finPayables)
              .where(inArray(finPayables.id, payableIds))
              .for('update');

            // Agora sob lock: a pergunta que o use case fez lá atrás, refeita no mesmo ato da
            // gravação. Quem chegou primeiro já gravou o vínculo e commitou; quem chega depois vê.
            const heldNow = await tx
              .select({ payableId: finRemittancePayables.payableId })
              .from(finRemittancePayables)
              .innerJoin(finRemittances, eq(finRemittances.id, finRemittancePayables.remittanceId))
              .where(
                and(
                  inArray(finRemittancePayables.payableId, payableIds),
                  inArray(finRemittances.status, [...HOLDING]),
                ),
              );

            // `throw` e não `return`: só a exceção desfaz a transação (o driver roda ROLLBACK no
            // catch e relança). O `catch` externo o reconhece e devolve o `Result` nomeado — a
            // convenção deste repositório, em vez do `tx.rollback()` do doc oficial, que não
            // carregaria qual erro foi.
            if (heldNow.length > 0) throw PAYABLES_ALREADY_HELD;

            // Criação: INSERT puro. Violação de UNIQUE (NSA por conta, nome de arquivo) LANÇA e
            // vira `Result` de erro no catch — que é o comportamento que se quer.
            await tx.insert(finRemittances).values({
              id: remittance.id,
              cedenteAccountId: remittance.cedenteAccountId,
              nsa: remittance.nsa,
              fileName: remittance.fileName,
              contentHash: remittance.contentHash,
              status: remittance.status,
              generatedAt: toMysqlDateTime(remittance.generatedAt),
              settledAt:
                remittance.settledAt === undefined ? null : toMysqlDateTime(remittance.settledAt),
              detail: remittance.detail ?? null,
            });

            // Vínculo é imutável: os documentos de uma remessa não mudam depois de criada, então
            // só são gravados na criação.
            //
            // `yourNumber` (#752) é gravado JUNTO, e não num passo à parte, porque a referência não
            // faz sentido sem o vínculo: um par gravado pela metade seria um documento preso cuja
            // chave de casamento ninguém sabe qual é. A transação já cobre isso.
            for (const { payableId, documentId, yourNumber } of remittance.payables) {
              await tx
                .insert(finRemittancePayables)
                .values({ remittanceId: remittance.id, payableId, documentId, yourNumber });
            }
          } else {
            // Atualização de desfecho, por ID. Só o que a máquina de estados muda — nunca NSA, nome
            // ou hash, que são imutáveis depois de gerada.
            await tx
              .update(finRemittances)
              .set({
                status: remittance.status,
                settledAt:
                  remittance.settledAt === undefined ? null : toMysqlDateTime(remittance.settledAt),
                detail: remittance.detail ?? null,
              })
              .where(eq(finRemittances.id, remittance.id));
          }

          // Estado e evento na MESMA transação (ADR-0015): o evento existe se e somente se o
          // desfecho foi persistido. Anunciar "remessa transmitida" e perder a gravação seria pior
          // que não anunciar — o operador agiria sobre um estado que o banco de dados não tem.
          //
          // No-op quando `events` é vazio, que é o caso da revarredura idempotente: o desfecho já
          // tinha sido anunciado, e reemitir encheria o outbox a cada 5 minutos, para sempre.
          await appendFinOutboxInTx(tx, events);
        });
        return ok(undefined);
      } catch (cause) {
        // Perder a corrida é desfecho ESPERADO sob concorrência, não avaria: sai com nome próprio e
        // sem poluir o stderr, para que o log siga significando "algo quebrou".
        if (cause === PAYABLES_ALREADY_HELD) return err('remittance-payables-already-held');
        logRepo('save', cause);
        return err('remittance-repository-unavailable');
      }
    },

    findById: async (id): Promise<Result<Remittance | null, RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.id, id))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row, await loadPayables(row.id));
        if (!mapped.ok) {
          logRepo('findById:map', mapped.error);
          return err('remittance-repository-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logRepo('findById', cause);
        return err('remittance-repository-unavailable');
      }
    },

    findByFileName: async (
      fileName: string,
    ): Promise<Result<Remittance | null, RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.fileName, fileName))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return ok(null);

        const mapped = toDomain(row, await loadPayables(row.id));
        if (!mapped.ok) {
          logRepo('findByFileName:map', mapped.error);
          return err('remittance-repository-unavailable');
        }
        return ok(mapped.value);
      } catch (cause) {
        logRepo('findByFileName', cause);
        return err('remittance-repository-unavailable');
      }
    },

    // JOIN no banco, não filtro em memória: outra instância pode ter enfileirado o mesmo título
    // há dois segundos, e uma resposta desatualizada aqui custa pagamento em dobro.
    //
    // ⚠️ Pergunta por TÍTULO. Filtrar por documento prenderia os irmãos junto: com o pai numa
    // remessa viva, a retenção da mesma nota apareceria como presa e o operador não conseguiria
    // pagá-la — o oposto da premissa de que cada título tem ciclo de vida próprio.
    findHeldPayableIds: async (
      payableIds: readonly string[],
    ): Promise<Result<readonly string[], RemittanceRepositoryError>> => {
      if (payableIds.length === 0) return ok([]);

      try {
        const rows = await db
          .select({ payableId: finRemittancePayables.payableId })
          .from(finRemittancePayables)
          .innerJoin(finRemittances, eq(finRemittances.id, finRemittancePayables.remittanceId))
          .where(
            and(
              inArray(finRemittancePayables.payableId, [...payableIds]),
              inArray(finRemittances.status, [...HOLDING]),
            ),
          );

        return ok([...new Set(rows.map((r) => r.payableId))].sort());
      } catch (cause) {
        logRepo('findHeldPayableIds', cause);
        return err('remittance-repository-unavailable');
      }
    },

    listByStatus: async (
      status: RemittanceStatus,
    ): Promise<Result<readonly Remittance[], RemittanceRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(finRemittances)
          .where(eq(finRemittances.status, status));
        const out: Remittance[] = [];

        for (const row of rows) {
          const mapped = toDomain(row, await loadPayables(row.id));
          if (!mapped.ok) {
            logRepo('listByStatus:map', mapped.error);
            return err('remittance-repository-unavailable');
          }
          out.push(mapped.value);
        }
        return ok(out);
      } catch (cause) {
        logRepo('listByStatus', cause);
        return err('remittance-repository-unavailable');
      }
    },

    // #728: página de acompanhamento. Um COUNT para o total; um SELECT ordenado por `generatedAt`
    // DESC (desempate por id desc, estável) com limit/offset; e os documentIds da página em UMA
    // query batch (`WHERE remittance_id IN (ids)`) agrupada num Map — evita o N+1 de chamar
    // `loadDocumentIds` por linha.
    listPaged: async (
      pagination: Readonly<{ limit: number; offset: number }>,
    ): Promise<
      Result<Readonly<{ items: readonly Remittance[]; total: number }>, RemittanceRepositoryError>
    > => {
      try {
        const totalRows = await db.select({ n: sql<number>`count(*)` }).from(finRemittances);
        const total = totalRows[0]?.n ?? 0;

        const rows = await db
          .select()
          .from(finRemittances)
          .orderBy(desc(finRemittances.generatedAt), desc(finRemittances.id))
          .limit(pagination.limit)
          .offset(pagination.offset);

        // Vínculos da página inteira numa consulta só — depois agrupados por remessa.
        const ids = rows.map((r) => r.id);
        const linkRows =
          ids.length === 0
            ? []
            : await db
                .select({
                  remittanceId: finRemittancePayables.remittanceId,
                  payableId: finRemittancePayables.payableId,
                  documentId: finRemittancePayables.documentId,
                  yourNumber: finRemittancePayables.yourNumber,
                })
                .from(finRemittancePayables)
                .where(inArray(finRemittancePayables.remittanceId, ids));

        const payablesByRemittance = new Map<string, RemittancePayable[]>();
        for (const link of linkRows) {
          const payable = {
            payableId: link.payableId,
            documentId: link.documentId,
            yourNumber: link.yourNumber,
          };
          const bucket = payablesByRemittance.get(link.remittanceId);
          if (bucket === undefined) {
            payablesByRemittance.set(link.remittanceId, [payable]);
          } else {
            bucket.push(payable);
          }
        }

        const items: Remittance[] = [];
        for (const row of rows) {
          const payables = (payablesByRemittance.get(row.id) ?? []).sort((a, b) =>
            a.payableId.localeCompare(b.payableId),
          );
          const mapped = toDomain(row, payables);
          if (!mapped.ok) {
            logRepo('listPaged:map', mapped.error);
            return err('remittance-repository-unavailable');
          }
          items.push(mapped.value);
        }
        return ok({ items, total });
      } catch (cause) {
        logRepo('listPaged', cause);
        return err('remittance-repository-unavailable');
      }
    },
  };
};
