/**
 * Sweep do outbox — marca `processed_at` nas linhas já resolvidas por TODOS os consumidores
 * (ADR-0064 §3). Lógica pura do job; o SQL vive no adapter por trás do port.
 *
 * ## Por que este job existe
 *
 * Com o claim por consumidor, `processed_at` deixou de ser escrito pelo worker — a conclusão
 * passou a viver em `eventos_processados`, por consumidor. O efeito colateral foi medido em
 * MySQL 8.4.11: sem nada que pode o outbox, o claim degradou de plano `ref` (10 linhas travadas,
 * 2ms) para `index` scan + `filesort` (**100.000 linhas travadas**, 115ms) com 50k retidos — acima
 * do próprio intervalo de poll de 100ms. E, como a dead-letter também parou de apagar a origem
 * (ADR-0022), o outbox não esvazia sozinho: o problema piora com o tempo.
 *
 * A marca volta, mas **fora do caminho do worker**. Pôr o `UPDATE` dentro de `markProcessed`
 * resolvia a leitura e custava 19 deadlocks em 60 eventos: os dois consumidores passariam a
 * escrever na mesma linha do outbox, em ordens de aquisição que se cruzam — reintroduzindo
 * justamente o acoplamento entre consumidores que a #800 existe para remover.
 *
 * ## A propriedade que torna isto seguro
 *
 * **Degradação graciosa.** Sweeper atrasado, parado ou nunca executado significa linhas não
 * marcadas — e o claim volta a ser o lento de antes, que continua **correto**: o `NOT EXISTS` por
 * consumidor segue lá e nenhum evento se perde. Este job otimiza; nunca decide entrega.
 */
import { type Result, ok, isErr } from '#src/shared/primitives/result.ts';
import type { OutboxQueryError } from '#src/shared/outbox/types.ts';
import type { Clock } from '#src/shared/ports/clock.ts';

export type OutboxSweepPort = Readonly<{
  /**
   * Marca `processed_at = now` nas linhas em que **todos** os `consumerIds` já concluíram ou
   * desistiram, limitado a `limit` linhas. Devolve quantas marcou.
   *
   * O adapter MUST resolver os candidatos por JOIN, nunca por subquery correlacionada: medido,
   * um `UPDATE` correlacionado sobre 50k travou 117.571 linhas por 17 minutos.
   */
  markFullyResolved: (
    input: Readonly<{ consumerIds: readonly string[]; now: Date; limit: number }>,
  ) => Promise<Result<number, OutboxQueryError>>;
}>;

export type OutboxSweepDeps = Readonly<{
  sweeper: OutboxSweepPort;
  clock: Clock;
}>;

export type OutboxSweepConfig = Readonly<{
  /**
   * Linhas por lote. **Pequeno de propósito:** o lote é o número de registros travados de uma vez.
   * Medido — 500 → 253ms travando 500; 5.000 → 341ms travando 5.000. O ganho de throughput não
   * compensa travar dez vezes mais, e lote grande ainda suja o buffer pool o bastante para
   * distorcer a latência das consultas seguintes.
   */
  batchSize: number;
  /** Teto de lotes por execução — impede o job one-shot de rodar indefinidamente. */
  maxBatches: number;
}>;

export type OutboxSweepResult = Readonly<{
  /** Linhas marcadas nesta execução. */
  marked: number;
  /** Lotes efetivamente executados. */
  batches: number;
  /** `true` se parou por atingir `maxBatches` — ou seja, ainda havia trabalho. */
  reachedLimit: boolean;
}>;

/**
 * Roda o sweep em lotes até esgotar o trabalho ou atingir `maxBatches`.
 *
 * Para no primeiro lote que marca zero: sob a semântica do port, zero significa "não há mais
 * linha totalmente resolvida", e não "tente de novo". Diferente do claim do worker, aqui não há
 * `SKIP LOCKED` — nenhum outro processo está disputando estas linhas com o sweeper.
 */
export const runOutboxSweep = async (
  deps: OutboxSweepDeps,
  config: OutboxSweepConfig,
  consumerIds: readonly string[],
): Promise<Result<OutboxSweepResult, OutboxQueryError>> => {
  // Sem consumidor declarado, marcar seria declarar entregue o que ninguém consumiu — o modo de
  // falha que a lista de `registered-consumers.ts` adverte. Não marcar é o lado seguro.
  if (consumerIds.length === 0) {
    return ok({ marked: 0, batches: 0, reachedLimit: false });
  }

  let marked = 0;
  let batches = 0;

  while (batches < config.maxBatches) {
    const batch = await deps.sweeper.markFullyResolved({
      consumerIds,
      now: deps.clock.now(),
      limit: config.batchSize,
    });
    if (isErr(batch)) return batch;

    batches += 1;
    marked += batch.value;
    if (batch.value === 0) {
      return ok({ marked, batches, reachedLimit: false });
    }
  }

  return ok({ marked, batches, reachedLimit: true });
};
