// `eventos_processados` — progresso de consumo do outbox, POR CONSUMIDOR.
//
// Nome em PT-BR e ausência de prefixo de módulo são exceção declarada: ADR-0014 §"Exceção
// linguística" e ADR-0015 §"Idempotência". É a única entrada da allowlist de
// `tests/cleanup/table-prefix-isolation.test.ts`.
//
// ## Por que a declaração vive em `shared/` e não no schema de um módulo
//
// A tabela é cross-módulo por desenho e é lida pelo adapter de outbox de MAIS DE UM módulo
// (`contracts` e `partners`). Declará-la nos dois `schemas/mysql.ts` faria `drizzle-kit generate`
// emitir um `CREATE TABLE` em cada journal — o segundo falharia no banco, que é um só
// (`compose.yaml`: todas as `*_DATABASE_URL` apontam para o mesmo db `core`). Uma declaração,
// re-exportada pelo `contracts`, que segue sendo o **dono das migrations** dela desde a `0001`.
//
// ## O que esta tabela passou a significar (#800, #824)
//
// Ela nasceu na `0001` com a PK composta correta — `(consumer_id, event_id)`, um registro por
// consumidor — e nunca foi ligada a código de produção. O worker marcava `processed_at` na
// PRÓPRIA linha do outbox, que é global: sob `FOR UPDATE SKIP LOCKED`, dois consumidores
// DIVIDIAM os eventos em vez de cada um receber todos. O ADR-0015:54-55 já separava os dois
// passos ("consumidor marca event_id como visto" ≠ "worker atualiza processed_at na origem");
// a implementação fundiu os dois num `processed_at` só, e o fanout morreu aí.
//
// Com o claim por consumidor, esta linha carrega TODO o progresso daquele consumidor sobre
// aquele evento — e não só o sucesso. Por isso `processed_at` é NULLABLE: a linha passa a
// existir na primeira falha, não apenas na conclusão.
//
//   processed_at IS NULL      · dead_lettered_at IS NULL  → em curso, elegível a nova tentativa
//   processed_at IS NOT NULL                              → concluído por este consumidor
//   dead_lettered_at IS NOT NULL                          → este consumidor desistiu (DLQ)
//
// Nenhum desses três estados diz nada sobre os OUTROS consumidores — que é exatamente a
// propriedade que faltava.

import {
  mysqlTable,
  datetime,
  smallint,
  varchar,
  index,
  primaryKey,
  check,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

import { opaqueKey, uuidKeyFixed } from '../identifier-columns.ts';

export const eventosProcessados = mysqlTable(
  'eventos_processados',
  {
    // Identificador do consumidor — o mesmo `consumerId` do `EventDelivery` (ex.: 'logger-default',
    // 'financial-supplier-view', 'partners-contract-count'). É o que separa um fanout de uma fila.
    consumerId: opaqueKey('consumer_id').notNull(),
    // UUID v4 do evento no outbox de origem. Sem FK: a tabela é cross-módulo e serve a
    // `ctr_outbox` e `par_outbox` ao mesmo tempo — não há UMA tabela pai para referenciar.
    eventId: uuidKeyFixed('event_id').notNull(),
    // NULL = ainda não concluído por este consumidor. NOT NULL = entregue com sucesso.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    // Tentativas DESTE consumidor. Antes vivia em `<outbox>.attempts`, que é global: a falha de um
    // consumidor consumia o orçamento de retry do outro e o mandava à DLQ sem nunca ter falhado.
    attempts: smallint('attempts').notNull().default(0),
    // Tag do último erro de entrega — diagnóstico de quem está travado e por quê.
    lastError: varchar('last_error', { length: 2048 }),
    // NOT NULL = este consumidor esgotou `maxAttempts` e desistiu. O evento SEGUE no outbox,
    // disponível aos demais: sob fanout, apagar a linha da origem rouba o evento dos outros.
    deadLetteredAt: datetime('dead_lettered_at', { mode: 'date', fsp: 3 }),
  },
  (t) => [
    // PK composta: cada consumer registra o event_id independentemente.
    primaryKey({ columns: [t.consumerId, t.eventId] }),
    // Índice temporal — auditoria "eventos processados nas últimas N horas".
    index('eventos_processados_processed_at_idx').on(t.processedAt),
    // Suporta o anti-join do claim: "o que este consumidor ainda não concluiu".
    index('eventos_processados_consumer_pending_idx').on(t.consumerId, t.processedAt),
    // CHECK attempts >= 0 — defesa em profundidade, espelha o das outboxes.
    check('eventos_processados_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
  ],
);

export type EventoProcessadoRow = typeof eventosProcessados.$inferSelect;
export type NewEventoProcessadoRow = typeof eventosProcessados.$inferInsert;
