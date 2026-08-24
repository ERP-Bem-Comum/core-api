/**
 * Adapter Drizzle do `OutboxSweepPort` — genérico sobre a tabela de outbox (ADR-0064 §3).
 *
 * Um adapter só para as cinco tabelas: todas expõem `event_id` e `processed_at`, que é tudo de que
 * o sweep precisa. Escrever cinco cópias seria repetir a mesma consulta com o nome trocado — e
 * este repositório já pagou por adapters duplicados que divergiram em silêncio.
 *
 * ## Duas decisões de SQL que vieram de medição, não de estilo
 *
 * **1. JOIN + `IN`, nunca subquery correlacionada.** Um `UPDATE … WHERE (SELECT COUNT(*) …)`
 * correlacionado sobre 50k linhas travou **117.571 registros por 17 minutos** em MySQL 8.4.11.
 * Aqui os candidatos saem num `SELECT` agregado com `LIMIT`, e o `UPDATE` só toca os ids
 * resolvidos.
 *
 * **2. Duas consultas, e não uma.** MySQL não aceita `LIMIT` em `UPDATE … JOIN`, e o `LIMIT` é
 * justamente o que mantém o lote pequeno — o lote é o número de registros travados de uma vez.
 */
import { sql } from 'drizzle-orm';
import type { MySqlTable } from 'drizzle-orm/mysql-core';
import process from 'node:process';

import { ok, err } from '#src/shared/primitives/result.ts';
import { outboxQueryUnavailable } from '#src/shared/outbox/types.ts';
import type { OutboxSweepPort } from '#src/jobs/shared/outbox-sweeper/sweep.ts';

/** Mínimo que o sweeper precisa do handle — qualquer um dos cinco módulos serve. */
type SweepableDb = Readonly<{
  // O objeto `SQL` do Drizzle é mutável por construção (acumula chunks); não há forma readonly
  // dele a exigir aqui.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  execute: (query: ReturnType<typeof sql>) => Promise<unknown>;
}>;

export const createDrizzleOutboxSweeper = (
  db: SweepableDb,
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  outbox: MySqlTable,
): OutboxSweepPort => ({
  markFullyResolved: async ({ consumerIds, now, limit }) => {
    if (consumerIds.length === 0) return ok(0);

    try {
      const idList = sql.join(
        consumerIds.map((c) => sql`${c}`),
        sql`, `,
      );

      // Candidatos: linhas ainda não marcadas em que TODOS os consumidores registrados já
      // resolveram (concluíram OU desistiram). `COUNT(DISTINCT …)` contra o total da lista é o
      // que traduz "todos" — e é por isso que sobre-declarar a lista é seguro e sub-declarar não:
      // um consumidor a mais faz a contagem nunca fechar; um a menos fecha cedo demais.
      const candidates = (await db.execute(sql`
        SELECT o.event_id AS eventId
        FROM ${outbox} o
        JOIN eventos_processados ep ON ep.event_id = o.event_id
        WHERE o.processed_at IS NULL
          AND ep.consumer_id IN (${idList})
          AND (ep.processed_at IS NOT NULL OR ep.dead_lettered_at IS NOT NULL)
        GROUP BY o.event_id
        HAVING COUNT(DISTINCT ep.consumer_id) = ${consumerIds.length}
        LIMIT ${limit}
      `)) as unknown as readonly (readonly { eventId: string }[])[];

      const ids = (candidates[0] ?? []).map((r) => r.eventId);
      if (ids.length === 0) return ok(0);

      const eventList = sql.join(
        ids.map((id) => sql`${id}`),
        sql`, `,
      );

      // `AND processed_at IS NULL` de novo: entre o SELECT e o UPDATE nada impede outro processo
      // de ter marcado. Torna a operação idempotente e o job seguro para rodar concorrente.
      // O retorno é tipado como ARRAY, não tupla: o formato vem do driver, e afirmar "tem
      // exatamente um elemento" seria garantia nossa sobre algo que não controlamos. Com array, o
      // `?.` abaixo passa a ser exigido pelo `noUncheckedIndexedAccess` — que é o correto.
      const updated = (await db.execute(sql`
        UPDATE ${outbox}
        SET processed_at = ${now}
        WHERE event_id IN (${eventList}) AND processed_at IS NULL
      `)) as unknown as readonly { affectedRows?: number }[];

      // `affectedRows`, e NÃO `ids.length`: sob dois sweepers concorrentes sobre o mesmo lote, o
      // segundo marca zero — porque o `IS NULL` acima já não casa — e reportar o tamanho do SELECT
      // diria que ele marcou 500. O número existe para auditar, e auditar com o valor errado é
      // pior que não auditar: é a mesma classe do `pendentes = 0` que originou este trabalho.
      return ok(updated[0]?.affectedRows ?? 0);
    } catch (cause) {
      process.stderr.write(`[outbox-sweeper] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  },
});
