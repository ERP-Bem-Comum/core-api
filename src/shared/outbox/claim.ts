/**
 * Peças do claim por consumidor que os adapters Drizzle compartilham (#800, #824).
 *
 * `contracts` e `partners` implementam o MESMO claim sobre tabelas diferentes (`ctr_outbox`,
 * `par_outbox`). O que não pode divergir entre eles mora aqui: o isolamento da transação e a
 * composição do contador de tentativas. O predicado de elegibilidade vive em
 * `consumer-progress.ts` — os dois arquivos são a fonte única que o SQL de cada adapter espelha.
 */
import type { ConsumerProgress } from './consumer-progress.ts';

/**
 * Isolamento da transação de claim — **READ COMMITTED**, e não o default do servidor.
 *
 * Medido em MySQL 8.4.11 real (21/08/2026): sob `REPEATABLE READ`, o `FOR UPDATE` do claim trava
 * NEXT-KEY (registro + gap) no índice secundário `(processed_at, occurred_at)` — 6 locks para 5
 * linhas, o sexto sendo o gap do supremum. Evento novo nasce com `processed_at = NULL` e cai
 * exatamente nesse gap: **o `INSERT` do produtor bloqueia e estoura `1205 Lock wait timeout`**.
 * O conflito não é entre consumidores; é do consumidor contra a transação de negócio, que é o
 * lado que não pode falhar.
 *
 * Sob READ COMMITTED os mesmos locks viram `X,REC_NOT_GAP` nos dois índices, os gaps somem e o
 * `INSERT` concorrente passa. O claim não precisa das garantias de RR: ele relê tudo na rodada
 * seguinte por construção — a linha que o `SKIP LOCKED` pulou reaparece assim que o outro
 * consumidor commita (medido: volta ao baseline completo). RR também produzia deadlock no caminho
 * normal (2 em 12 rodadas) e cegava um consumidor ALÉM das linhas efetivamente travadas.
 */
export const CLAIM_ISOLATION = { isolationLevel: 'read committed' } as const;

/**
 * Tentativas a atribuir a um evento reivindicado, a partir do progresso DESTE consumidor.
 *
 * Ausência de progresso = zero tentativas. É a diferença que importa: antes, `attempts` vinha da
 * coluna global da linha do outbox, então a falha de um consumidor consumia o orçamento de retry
 * do outro — e o mandava à DLQ sem que ele jamais tivesse falhado.
 */
export const claimedAttempts = (
  progress: Readonly<Pick<ConsumerProgress, 'attempts'>> | undefined,
): number => progress?.attempts ?? 0;
