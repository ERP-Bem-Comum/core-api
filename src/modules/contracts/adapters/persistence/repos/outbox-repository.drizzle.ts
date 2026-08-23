import {
  isNull,
  isNotNull,
  asc,
  eq,
  and,
  or,
  notExists,
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import process from 'node:process';

import { eventosProcessados } from '#src/shared/persistence/schemas/eventos-processados.ts';
import { CLAIM_ISOLATION, claimedAttempts } from '#src/shared/outbox/claim.ts';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import {
  outboxAppendUnavailable,
  outboxAppendDuplicateEventId,
  outboxQueryUnavailable,
  outboxEventNotFound,
} from '../../../application/ports/outbox.ts';
import type {
  OutboxAppendError,
  OutboxQueryError,
  OutboxBatchOps,
  OutboxFailure,
  WorkerOutboxOps,
} from '../../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import {
  eventToOutboxInsert,
  contractEventsToOutboxInserts,
  type OutboxRow,
} from '../mappers/outbox.mapper.ts';
import type { ContractorRef } from '../../../domain/shared/contractor.ts';
import type * as schema from '../schemas/mysql.ts';

// ─── ER_DUP_ENTRY detection ───────────────────────────────────────────────────

// mysql2 expõe `errno: 1062` e `code: 'ER_DUP_ENTRY'` no objeto Error lançado.
// Drizzle pode encadear o erro original em `cause`. Verificamos ambas as camadas.
const isDupEntry = (e: unknown): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  return candidates.some((c) => {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (obj['errno'] === 1062) return true;
      if (typeof obj['code'] === 'string' && obj['code'] === 'ER_DUP_ENTRY') return true;
    }
    const msg = String(c instanceof Error ? c.message : c);
    return msg.includes('Duplicate entry') || msg.includes('ER_DUP_ENTRY');
  });
};

// ─── appendOutboxInTx ─────────────────────────────────────────────────────────
//
// Função standalone para INSERT em batch no outbox DENTRO de uma transação já
// aberta pelo repo pai (contract-repository ou amendment-repository). O repo pai
// chama esta função dentro do próprio `db.transaction(async (tx) => { ... })` —
// garantindo que state + outbox são escritos na MESMA transação (D2, ADR-0015).
//
// Por que lança em vez de retornar Result?
//   O callback de `db.transaction` precisa propagar erros para que o Drizzle faça
//   rollback. Se este helper retornasse `err(...)`, o caller precisaria checar e
//   re-lançar — boilerplate que viola o princípio de "adapter converte na borda".
//   O repo pai captura qualquer throw dentro do callback via `safe()` e converte
//   para `ContractRepositoryError` / `AmendmentRepositoryError` antes de retornar
//   ao use case. Portanto `throw` aqui é correto — estamos ainda dentro do adapter.
//
// `tx` é tipado como `{ insert: MySql2Database<...>['insert'] }` para aceitar tanto
// `MySql2Database` (fora de tx) quanto `MySqlTransaction` (dentro de tx) —
// ambos expõem `.insert()`. O acoplamento structural é intencional e documentado.
export const appendOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: MysqlHandle['db']['insert'] },
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  schemaArg: typeof schema,
  events: readonly ContractsModuleEvent[],
  // US6a (ADR-0046): quando o repo pai é o contract-repository, passa `contract.contractor`
  // p/ enriquecer os eventos de ciclo de vida com contractorRef (aditivo, sem bump). Ausente
  // (amendment-repository / append genérico) → caminho original inalterado.
  contractor?: ContractorRef,
): Promise<void> => {
  if (events.length === 0) return;
  const now = new Date();
  const inserts =
    contractor === undefined
      ? events.map((e) => eventToOutboxInsert(e, now))
      : [...contractEventsToOutboxInserts(events, contractor, now)];
  await tx.insert(schemaArg.ctrOutbox).values(inserts);
};

// ─── safe wrapper ─────────────────────────────────────────────────────────────

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[outbox-repo:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

// ─── Factory options ──────────────────────────────────────────────────────────

export type DrizzleOutboxRepositoryOptions = Readonly<{
  /** Override do gerador de UUID — útil para testes de ER_DUP_ENTRY determinísticos. */
  idGenerator?: () => string;
}>;

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * createDrizzleOutboxRepository
 *
 * Implementação do OutboxPort + auxiliares do worker para MySQL via Drizzle.
 *
 * Funções públicas do port:
 *   - `append(events)` — batch INSERT em `ctr_outbox`. ER_DUP_ENTRY → tagged.
 *
 * Auxiliares do worker (ticket #5):
 *   - `findPendingForUpdate(limit)` — SELECT WHERE processed_at IS NULL ORDER BY occurred_at FOR UPDATE SKIP LOCKED.
 *   - `markProcessed(eventId, now)` — UPDATE processed_at WHERE processed_at IS NULL (idempotente).
 *   - `markFailed(eventId, now, errorTag, attempt)` — UPDATE attempts + last_error.
 *   - `moveToDeadLetter(eventId, now, errorMessage)` — INSERT DLQ + DELETE outbox (transação).
 *
 * Helpers de teste (sincronos para compatibilidade com outbox.contract.ts):
 *   - `testHelpers.all()` — snapshot das rows inseridas via `append` nesta instância.
 *   - `testHelpers.pending()` — filtra rows do snapshot com processedAt null.
 *   - `testHelpers.markProcessed(eventId)` — atualiza processedAt no snapshot local.
 *
 * NOTA sobre testHelpers: o buffer é mantido em memória apenas para satisfazer a
 * interface síncrona da suite contratual. Não reflete o estado real do DB após
 * operações externas (DELETE, UPDATE por outro processo). Nunca usar em prod.
 */
export const createDrizzleOutboxRepository = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  opts?: DrizzleOutboxRepositoryOptions,
  // `WorkerOutboxOps` em vez da lista repetida à mão: o contrato de consumo é canônico em
  // `shared/outbox/types.ts`, e assinar por ele faz o compilador cobrar o `consumerId` em cada
  // operação. Enquanto cada adapter redeclarava a própria forma, nada impedia um deles de ficar
  // para trás — foi assim que dois adapters ficaram errados juntos, concordando entre si.
): OutboxPort &
  WorkerOutboxOps & {
    testHelpers: {
      all: () => readonly OutboxRow[];
      pending: () => readonly OutboxRow[];
      markProcessed: (eventId: string) => void;
    };
  } => {
  const { db, schema } = handle;
  const idGenerator = opts?.idGenerator;

  // ── Buffer interno para helpers de teste ──────────────────────────────────
  // Mantido sincronizado com cada `append` bem-sucedido.
  // Usado exclusivamente para satisfazer a interface síncrona da suite contratual.
  const appendedRows: OutboxRow[] = [];

  // ── pendingForConsumer ────────────────────────────────────────────────────
  //
  // O predicado do claim, em UM lugar: "este consumidor ainda não concluiu nem desistiu deste
  // evento". É a tradução SQL de `isPendingForConsumer` (`shared/outbox/consumer-progress.ts`) —
  // as duas formas descrevem a mesma regra e mudam juntas.
  //
  // A subquery é construída a partir de `db`, mas isso não a executa: o Drizzle só gera o SQL, e
  // quem roda é a query externa — dentro da `tx` no claim, fora dela no helper direto.

  // Devolve `SQL | undefined` em vez de castar para `SQL`: `.where()` do Drizzle aceita os dois,
  // e é o idioma que o repositório já usa (`contract-repository.drizzle.ts:146` e outros). O cast
  // caía numa contradição entre duas regras de lint — `non-nullable-type-assertion-style` pede
  // `!` no lugar de `as`, e `no-non-null-assertion` proíbe `!`.
  const pendingForConsumer = (consumerId: string): SQL | undefined =>
    // `processed_at IS NULL` PRIMEIRO, e não por estilo: é o que faz o claim voltar a ser
    // indexável. Medido em MySQL 8.4.11 com 50k retidos e 10 pendentes — sem esta cláusula, o
    // `NOT EXISTS` sozinho não poda nada e o plano degrada de `ref` (key_len 8, 10 linhas
    // travadas, 2ms) para `index` scan + `filesort` (100.000 linhas travadas, 115ms), acima do
    // próprio intervalo de poll de 100ms. Índice em `eventos_processados` NÃO resolve: o gargalo
    // não é o acesso a ela, é não haver predicado seletivo sobre o outbox.
    //
    // A marca é escrita pelo sweeper (`src/jobs/shared/outbox-sweeper/`), nunca pelo worker —
    // ver ADR-0062 §3. Se o sweeper atrasar ou parar, sobram linhas não marcadas e o claim volta
    // a ser o lento: degradação graciosa, e o `NOT EXISTS` abaixo garante que nada se perde.
    and(
      isNull(schema.ctrOutbox.processedAt),
      notExists(
        db
          .select({ one: sql`1` })
          .from(eventosProcessados)
          .where(
            and(
              eq(eventosProcessados.consumerId, consumerId),
              eq(eventosProcessados.eventId, schema.ctrOutbox.eventId),
              or(
                isNotNull(eventosProcessados.processedAt),
                isNotNull(eventosProcessados.deadLetteredAt),
              ),
            ),
          ),
      ),
    );

  // ── append ────────────────────────────────────────────────────────────────

  const append = async (
    events: readonly ContractsModuleEvent[],
  ): Promise<Result<void, OutboxAppendError>> => {
    if (events.length === 0) return ok(undefined);

    const now = new Date();
    // eventToOutboxInsert é síncrono e não lança — o try é defesa em profundidade.
    const inserts = events.map((e) => eventToOutboxInsert(e, now, idGenerator));

    try {
      await db.insert(schema.ctrOutbox).values(inserts);
      // Sincronizar buffer de teste apenas após INSERT bem-sucedido.
      for (const insert of inserts) {
        appendedRows.push(insert as OutboxRow);
      }
      return ok(undefined);
    } catch (cause) {
      if (isDupEntry(cause)) {
        // Identificar qual eventId colidiu: o batch inteiro falhou, então
        // reportamos o primeiro ID que causaria colisão (o que disparou ER_DUP_ENTRY).
        // Como mysql2 não informa qual chave colidiu via código estruturado de forma
        // confiável no modo batch, retornamos o primeiro eventId do batch.
        // O adapter InMemory faz a mesma coisa (retorna o primeiro duplicado detectado).
        const firstId = inserts[0]?.eventId ?? 'unknown';
        return err(outboxAppendDuplicateEventId(firstId));
      }
      process.stderr.write(`[outbox-repo:append] ${String(cause)}\n`);
      return err(outboxAppendUnavailable());
    }
  };

  // ── findPendingForUpdate ──────────────────────────────────────────────────

  const findPendingForUpdate = async (
    consumerId: string,
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(schema.ctrOutbox)
        .where(pendingForConsumer(consumerId))
        .orderBy(asc(schema.ctrOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────
  // Claim POR CONSUMIDOR (#824). Abre UMA transação em READ COMMITTED (ver `CLAIM_ISOLATION`),
  // reivindica até `limit` rows com FOR UPDATE SKIP LOCKED e invoca `handler` com as rows + ops
  // ligadas à MESMA tx. O lock sobrevive até o COMMIT.
  //
  // O que mudou, e por quê: a pendência deixou de ser `processed_at IS NULL` na linha do outbox —
  // um estado GLOBAL — e passou a ser a ausência de conclusão DESTE consumidor em
  // `eventos_processados`. Com o critério global, `SKIP LOCKED` fazia dois consumidores de
  // propósitos diferentes DIVIDIREM os eventos (semântica de fila) quando o requisito é que cada
  // um receba TODOS (fanout). O `NOT EXISTS` abaixo é a tradução literal de `isPendingForConsumer`
  // — se um dos dois mudar, o outro tem de mudar junto, senão o in-memory dos testes passa a
  // descrever um comportamento que produção não tem.
  //
  // O `SKIP LOCKED` continua correto e necessário: ele agora separa INSTÂNCIAS do mesmo consumidor
  // (que devem dividir), não consumidores distintos. Quando A trava uma linha, B a pula NAQUELA
  // rodada e a reencontra na seguinte — medido em MySQL 8.4.11: após o COMMIT de A, B volta a ver
  // o conjunto inteiro. Pulada, nunca perdida.

  const withPendingBatch = async <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const claimed = (await tx
          .select()
          .from(schema.ctrOutbox)
          // Espelha `isPendingForConsumer`: concluído OU desistido barra a reentrega.
          .where(pendingForConsumer(consumerId))
          .orderBy(asc(schema.ctrOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        // `attempts` vem do progresso DESTE consumidor, não da coluna global da linha. Segunda
        // query em vez de JOIN: o Drizzle não expõe `FOR UPDATE OF <tabela>`, então um JOIN sob o
        // claim travaria `eventos_processados` junto — medido, o `NOT EXISTS` correlacionado não
        // a trava (ela não aparece em `performance_schema.data_locks`), e é isso que faz dois
        // consumidores não disputarem lock na tabela de marcação.
        const claimedIds = claimed.map((r) => r.eventId);
        const progresses =
          claimedIds.length === 0
            ? []
            : await tx
                .select()
                .from(eventosProcessados)
                .where(
                  and(
                    eq(eventosProcessados.consumerId, consumerId),
                    inArray(eventosProcessados.eventId, claimedIds),
                  ),
                );
        const progressByEvent = new Map(progresses.map((p) => [p.eventId, p]));
        const rows: readonly OutboxRow[] = claimed.map((r) => ({
          ...r,
          attempts: claimedAttempts(progressByEvent.get(r.eventId)),
        }));

        const ops: OutboxBatchOps = {
          markProcessed: async (eventId, now) =>
            safe('withPendingBatch:markProcessed', async () => {
              // Upsert na PK (consumer_id, event_id): idempotente por construção — a 2ª marcação
              // do MESMO consumidor apenas reescreve o carimbo. A linha do outbox não é tocada.
              await tx
                .insert(eventosProcessados)
                .values({ consumerId, eventId, processedAt: now, attempts: 0 })
                .onDuplicateKeyUpdate({ set: { processedAt: now } });
            }),
          markFailed: async (eventId, { errorTag, attempt }) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .insert(eventosProcessados)
                .values({ consumerId, eventId, attempts: attempt, lastError: errorTag })
                .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
            }),
          moveToDeadLetter: async (eventId, now, errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === eventId);
              if (target === undefined) return;
              await tx
                .insert(schema.ctrOutboxDeadLetter)
                .values({
                  consumerId,
                  eventId: target.eventId,
                  aggregateId: target.aggregateId,
                  aggregateType: target.aggregateType,
                  eventType: target.eventType,
                  schemaVersion: target.schemaVersion,
                  occurredAt: target.occurredAt,
                  enqueuedAt: target.enqueuedAt,
                  failedAt: now,
                  attempts: target.attempts,
                  lastError: errorMessage,
                  payload: target.payload,
                })
                .onDuplicateKeyUpdate({ set: { failedAt: now, lastError: errorMessage } });
              // A desistência é DESTE consumidor e vive no progresso dele.
              await tx
                .insert(eventosProcessados)
                .values({
                  consumerId,
                  eventId,
                  attempts: target.attempts,
                  lastError: errorMessage,
                  deadLetteredAt: now,
                })
                .onDuplicateKeyUpdate({ set: { deadLetteredAt: now, lastError: errorMessage } });
              // ⚠️ Sem DELETE na origem — deliberado. O `DELETE` que existia aqui apagava o evento
              // para TODOS os consumidores por causa da desistência de um só, e violava o
              // ADR-0022:27-29 ("o outbox RETÉM as entradas após a entrega… NÃO deleta"), levando
              // junto a reconstrução prometida em 0022:40. O defeito era anterior ao fanout.
            }),
        };

        return handler(rows, ops);
      }, CLAIM_ISOLATION);
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[outbox-repo:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markProcessed', async () => {
      // A idempotência vem da PK (consumer_id, event_id): a 2ª marcação do MESMO consumidor cai
      // no `ON DUPLICATE KEY UPDATE` e só reescreve o carimbo. A linha do outbox NÃO é tocada —
      // marcá-la seria declarar o evento resolvido para todos os consumidores, que era o defeito.
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, processedAt: now, attempts: 0 })
        .onDuplicateKeyUpdate({ set: { processedAt: now } });
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    consumerId: string,
    eventId: string,
    // `now` não é desestruturado: `eventos_processados` carimba conclusão e desistência, não a
    // hora da última falha. `errorTag`, que antes não tinha onde morar, agora tem: `last_error`.
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markFailed', async () => {
      // O orçamento de retry é DESTE consumidor. Antes vivia em `ctr_outbox.attempts`, global: a
      // falha de um consumidor gastava as tentativas do outro e o mandava à DLQ sem que ele
      // jamais tivesse falhado — um segundo defeito, distinto da perda de evento.
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, attempts: attempt, lastError: errorTag })
        .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
    });
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────
  // Implementação direta (sem safe()) para distinguir OutboxEventNotFound de
  // erros genéricos de I/O. Usa um Result<void, OutboxQueryError> retornado
  // pela tx interna como canal de controle — sem `class` (ESLint proíbe).

  const moveToDeadLetterFinal = async (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    try {
      // Usamos um array mutável como "out parameter" para transportar o Result
      // de dentro da tx para fora sem precisar de `class extends Error`.
      // A tx lança em caso de erro de I/O; erros lógicos (not-found) são capturados
      // no array e não causam rollback — só o fluxo normal de controle retorna err().
      const txResult: [OutboxQueryError | null] = [null];

      await db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(schema.ctrOutbox)
          .where(eq(schema.ctrOutbox.eventId, eventId))
          .for('update');

        const row = rows[0];
        if (row === undefined) {
          // Sinaliza not-found via out-param; a tx não precisa ser abortada.
          txResult[0] = outboxEventNotFound(eventId);
          return;
        }

        // As tentativas gravadas na DLQ são as DESTE consumidor — a coluna global da linha diria
        // quantas vezes QUALQUER UM falhou, que não é o que a DLQ dele documenta.
        const progress = await tx
          .select()
          .from(eventosProcessados)
          .where(
            and(
              eq(eventosProcessados.consumerId, consumerId),
              eq(eventosProcessados.eventId, eventId),
            ),
          );

        await tx
          .insert(schema.ctrOutboxDeadLetter)
          .values({
            consumerId,
            eventId: row.eventId,
            aggregateId: row.aggregateId,
            aggregateType: row.aggregateType,
            eventType: row.eventType,
            schemaVersion: row.schemaVersion,
            occurredAt: row.occurredAt,
            enqueuedAt: row.enqueuedAt,
            failedAt: now,
            attempts: claimedAttempts(progress[0]),
            lastError: errorMessage,
            payload: row.payload,
          })
          .onDuplicateKeyUpdate({ set: { failedAt: now, lastError: errorMessage } });

        await tx
          .insert(eventosProcessados)
          .values({
            consumerId,
            eventId,
            attempts: claimedAttempts(progress[0]),
            lastError: errorMessage,
            deadLetteredAt: now,
          })
          .onDuplicateKeyUpdate({ set: { deadLetteredAt: now, lastError: errorMessage } });

        // ⚠️ Sem DELETE na origem — ver a nota em `withPendingBatch`. A desistência de UM
        // consumidor não pode apagar o evento dos demais, e o ADR-0022:27-29 exige que o outbox
        // retenha a entrada para que a reconstrução de 0022:40 continue possível.
      });

      // Se a tx setou um erro lógico, devolve sem logar (não é falha de I/O).
      const logicError = txResult[0];
      if (logicError !== null) {
        return err(logicError);
      }
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[outbox-repo:moveToDeadLetter] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── testHelpers ───────────────────────────────────────────────────────────

  const testHelpers = {
    all: (): readonly OutboxRow[] => appendedRows as readonly OutboxRow[],
    pending: (): readonly OutboxRow[] =>
      appendedRows.filter((r) => r.processedAt === null) as readonly OutboxRow[],
    markProcessed: (targetEventId: string): void => {
      const row = appendedRows.find((r) => r.eventId === targetEventId);
      if (row !== undefined) {
        // Mutação controlada apenas dentro do helper de teste.
        (row as { processedAt: Date | null }).processedAt = new Date();
      }
    },
  };

  return {
    append,
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter: moveToDeadLetterFinal,
    testHelpers,
  };
};
