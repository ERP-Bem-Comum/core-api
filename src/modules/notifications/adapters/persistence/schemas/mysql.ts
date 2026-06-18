// Schema MySQL — módulo notifications, alinhado com ADR-0020 (MySQL como único dialeto).
// Tipos: varchar/smallint/datetime(3). Sem JSON, sem ENUM, sem AUTO_INCREMENT.
// IDs (UUID v4): varchar(36). Instantes: datetime(3). Payload: varchar (JSON serializado
// pela aplicação — nunca JSON nativo, ADR-0020 §"proibido").
//
// Convenção (ADR-0020 §"Convenção" + ADR-0014 §"isolamento por prefixo"):
//   - Tabelas: prefixo `notifications_*` dentro do database `core`.
//   - CHECKs:  `notifications_<tabela_sem_prefixo>_<descrição>_chk`.
//   - Índices/únicos: `notifications_<abreviação>_<coluna(s)>_idx`.
//
// ⚠️ CHARSET/COLLATE — aplicado em SQL manual (limitação Drizzle 0.45.x):
//   - Por tabela:  `ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
//   - `event_id`/`aggregate_id` varchar(36): `COLLATE utf8mb4_bin` (UUID — comparação binária).
//
// **RESPONSABILIDADE DO PRÓXIMO DEV**: ao rodar `pnpm db:generate:notifications`, editar o
// SQL gerado com ENGINE/charset e `COLLATE utf8mb4_bin` em colunas UUID.

import {
  check,
  datetime,
  index,
  mysqlTable,
  smallint,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

// ─── notifications_email_outbox — e-mails pendentes/em processamento ──────────
//
// Espelha `par_outbox`/`ctr_outbox` (ADR-0015), mas o "evento" é uma intenção de
// envio: `payload` = JSON da `EmailMessage` serializado pela aplicação. O worker lê
// WHERE processed_at IS NULL ORDER BY occurred_at LIMIT N FOR UPDATE SKIP LOCKED,
// chama `EmailSender.send` e marca processed/failed/dead-letter.
//
// `idempotency_key` UNIQUE deduplica o enqueue (CA2): dois pedidos com a mesma chave
// não criam duas linhas (o segundo INSERT é rejeitado por ER_DUP_ENTRY).
export const notificationsEmailOutbox = mysqlTable(
  'notifications_email_outbox',
  {
    // UUID v4 do evento — gerado antes do INSERT. COLLATE utf8mb4_bin no SQL manual.
    eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
    // ID do agregado lógico (recipient/contexto). COLLATE utf8mb4_bin no SQL manual.
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
    // 'EmailMessage' — controlado por CHECK abaixo.
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    // PascalCase EN: EmailEnqueued.
    eventType: varchar('event_type', { length: 64 }).notNull(),
    // Versão do contrato do payload (inicia em 1).
    schemaVersion: smallint('schema_version').notNull(),
    // Timestamp do momento em que o e-mail foi enfileirado no domínio.
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    // Timestamp do INSERT na outbox (audit trail).
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    // NULL = pendente; NOT NULL = worker marcou após delivery OK.
    processedAt: datetime('processed_at', { mode: 'date', fsp: 3 }),
    // Número de tentativas de entrega. Default 0; incrementado pelo worker.
    attempts: smallint('attempts').notNull().default(0),
    // JSON da EmailMessage — VARCHAR, nunca JSON nativo (ADR-0020).
    payload: varchar('payload', { length: 8192 }).notNull(),
    // Chave de idempotência do enqueue (CA2). UNIQUE → dedup.
    idempotencyKey: varchar('idempotency_key', { length: 200 }).notNull(),
  },
  (t) => [
    check('notifications_email_outbox_attempts_nonneg_chk', sql`${t.attempts} >= 0`),
    check(
      'notifications_email_outbox_event_type_nonempty_chk',
      sql`CHAR_LENGTH(${t.eventType}) > 0`,
    ),
    check(
      'notifications_email_outbox_aggregate_type_chk',
      sql`${t.aggregateType} IN ('EmailMessage')`,
    ),
    // Índice composto (ADR-0015 §"Sobre o índice"): processed_at PRIMEIRO → NULLs
    // agrupados → worker faz range scan eficiente na query canônica.
    index('notifications_email_outbox_processed_occurred_idx').on(t.processedAt, t.occurredAt),
    // UNIQUE(idempotency_key) — dedup do enqueue (CA2).
    uniqueIndex('notifications_email_outbox_idem_idx').on(t.idempotencyKey),
  ],
);

export type EmailOutboxRow = typeof notificationsEmailOutbox.$inferSelect;
export type NewEmailOutboxRow = typeof notificationsEmailOutbox.$inferInsert;

// ─── notifications_email_outbox_dead_letter — e-mails que falharam N tentativas ─
//
// Espelha `par_outbox_dead_letter`. O worker move para cá quando `attempts >=
// MAX_ATTEMPTS` ou quando o payload é corrupto. Cópia da row original + `failed_at`
// + `last_error`. Sem FK com a outbox (a row original é apagada ao mover).
export const notificationsEmailOutboxDeadLetter = mysqlTable(
  'notifications_email_outbox_dead_letter',
  {
    eventId: varchar('event_id', { length: 36 }).primaryKey().notNull(),
    aggregateId: varchar('aggregate_id', { length: 36 }).notNull(),
    aggregateType: varchar('aggregate_type', { length: 32 }).notNull(),
    eventType: varchar('event_type', { length: 64 }).notNull(),
    schemaVersion: smallint('schema_version').notNull(),
    occurredAt: datetime('occurred_at', { mode: 'date', fsp: 3 }).notNull(),
    enqueuedAt: datetime('enqueued_at', { mode: 'date', fsp: 3 }).notNull(),
    failedAt: datetime('failed_at', { mode: 'date', fsp: 3 }).notNull(),
    attempts: smallint('attempts').notNull(),
    lastError: varchar('last_error', { length: 2048 }).notNull(),
    payload: varchar('payload', { length: 8192 }).notNull(),
  },
  (t) => [
    check(
      'notifications_email_outbox_dlq_aggregate_type_chk',
      sql`${t.aggregateType} IN ('EmailMessage')`,
    ),
    index('notifications_email_outbox_dlq_failed_at_idx').on(t.failedAt),
  ],
);

export type EmailOutboxDeadLetterRow = typeof notificationsEmailOutboxDeadLetter.$inferSelect;
export type NewEmailOutboxDeadLetterRow = typeof notificationsEmailOutboxDeadLetter.$inferInsert;
