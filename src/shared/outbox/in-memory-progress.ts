/**
 * Progresso por consumidor em memória — o espelho de `eventos_processados` que os adapters
 * InMemory usam (#800, #824).
 *
 * Existe para que os cinco adapters InMemory do repositório não escrevam, cada um, a sua versão
 * da mesma regra. O adapter Drizzle traduz `isPendingForConsumer` em SQL; este traduz em `Map`.
 * Quando as duas traduções divergem, a suíte fica verde descrevendo um comportamento que produção
 * não tem — e foi exatamente assim que dois adapters ficaram errados juntos, concordando um com o
 * outro, sem nenhum teste acusar.
 *
 * ## Por que `Map` aninhado, e não uma chave composta em string
 *
 * A primeira versão concatenava `consumerId` e `eventId` num separador único. Duas razões para
 * abandonar a ideia: um separador que possa ocorrer DENTRO de um `consumerId` (que é
 * `varchar(64)` opaco) faz duas chaves distintas colidirem em silêncio; e a escolha de um
 * separador "impossível" leva direto a caracteres de controle — o byte NUL literal chegou a
 * entrar aqui, e o efeito não foi um bug de runtime, foi o **git passar a tratar o arquivo como
 * binário**: 87 linhas com a regra central do fanout apareciam no commit como `Bin 0 -> 3021
 * bytes`, invisíveis para qualquer revisor. Aninhar dispensa separador e a pergunta inteira.
 */
import { isPendingForConsumer, type ConsumerProgress } from './consumer-progress.ts';

export type InMemoryProgressStore = Readonly<{
  /** O evento ainda deve ser entregue a este consumidor? Delega ao predicado canônico. */
  isPending: (consumerId: string, eventId: string) => boolean;
  /** Tentativas DESTE consumidor sobre este evento (0 se nunca tocou). */
  attempts: (consumerId: string, eventId: string) => number;
  markProcessed: (consumerId: string, eventId: string, now: Date) => void;
  markFailed: (consumerId: string, eventId: string, errorTag: string, attempt: number) => void;
  markDeadLettered: (consumerId: string, eventId: string, now: Date, errorTag: string) => void;
  /** Inspeção em teste — o progresso registrado para um consumidor. */
  get: (consumerId: string, eventId: string) => ConsumerProgress | undefined;
  clear: () => void;
}>;

export const createInMemoryProgressStore = (): InMemoryProgressStore => {
  // consumerId → (eventId → progresso). O análogo em memória da PK composta de
  // `eventos_processados`, sem depender de um separador entre as duas partes.
  const byConsumer = new Map<string, Map<string, ConsumerProgress>>();

  const read = (consumerId: string, eventId: string): ConsumerProgress | undefined =>
    byConsumer.get(consumerId)?.get(eventId);

  const upsert = (
    consumerId: string,
    eventId: string,
    patch: Partial<Omit<ConsumerProgress, 'consumerId' | 'eventId'>>,
  ): void => {
    const events = byConsumer.get(consumerId) ?? new Map<string, ConsumerProgress>();
    const current = events.get(eventId);
    events.set(eventId, {
      consumerId,
      eventId,
      processedAt: current?.processedAt ?? null,
      attempts: current?.attempts ?? 0,
      lastError: current?.lastError ?? null,
      deadLetteredAt: current?.deadLetteredAt ?? null,
      ...patch,
    });
    byConsumer.set(consumerId, events);
  };

  return {
    isPending: (consumerId, eventId) => isPendingForConsumer(read(consumerId, eventId)),
    attempts: (consumerId, eventId) => read(consumerId, eventId)?.attempts ?? 0,
    markProcessed: (consumerId, eventId, now) => {
      upsert(consumerId, eventId, { processedAt: now });
    },
    markFailed: (consumerId, eventId, errorTag, attempt) => {
      upsert(consumerId, eventId, { attempts: attempt, lastError: errorTag });
    },
    markDeadLettered: (consumerId, eventId, now, errorTag) => {
      upsert(consumerId, eventId, { deadLetteredAt: now, lastError: errorTag });
    },
    get: read,
    clear: () => {
      byConsumer.clear();
    },
  };
};
