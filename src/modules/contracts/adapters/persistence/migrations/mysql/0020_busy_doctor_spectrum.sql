-- Fanout do outbox por consumidor (#800, #824).
--
-- ⚠️ ORDEM CORRIGIDA À MÃO. `drizzle-kit generate` emitiu `ADD PRIMARY KEY(consumer_id, event_id)`
-- ANTES de `ADD consumer_id`, o que falha: a PK referencia coluna inexistente. O gerador ordena
-- por tipo de operação, não por dependência entre elas. As três cláusulas de
-- `ctr_outbox_dead_letter` foram fundidas num único ALTER — é a forma medida em MySQL 8.4.11
-- (21/08/2026): INPLACE, LOCK=NONE, sem COPY, inclusive com a tabela populada.
--
-- Nenhum ALTER leva hint de ALGORITHM: `ALGORITHM=INSTANT` devolve 1845 tanto no MODIFY de
-- nullability quanto no ADD PRIMARY KEY e no CREATE INDEX. Sem hint, o servidor escolhe o melhor
-- disponível e nenhum destes degrada para COPY.
--
-- `consumer_id NOT NULL` sem DEFAULT preencheria linhas existentes com string vazia (medido: nem
-- STRICT_ALL_TABLES impede) — inócuo aqui porque `ctr_outbox_dead_letter` está vazia em todos os
-- ambientes medidos. Se algum ambiente tiver linha, ela precisa de backfill ANTES desta migration.
ALTER TABLE `ctr_outbox_dead_letter`
  ADD `consumer_id` varchar(64) COLLATE utf8mb4_bin NOT NULL,
  DROP PRIMARY KEY,
  ADD PRIMARY KEY(`consumer_id`,`event_id`);--> statement-breakpoint
-- `processed_at` deixa de ser NOT NULL: a linha passa a existir na primeira FALHA, não apenas na
-- conclusão — é o que permite `attempts`/`last_error` serem por consumidor.
ALTER TABLE `eventos_processados` MODIFY COLUMN `processed_at` datetime(3);--> statement-breakpoint
ALTER TABLE `eventos_processados` ADD `attempts` smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `eventos_processados` ADD `last_error` varchar(2048);--> statement-breakpoint
ALTER TABLE `eventos_processados` ADD `dead_lettered_at` datetime(3);--> statement-breakpoint
ALTER TABLE `eventos_processados` ADD CONSTRAINT `eventos_processados_attempts_nonneg_chk` CHECK (`eventos_processados`.`attempts` >= 0);--> statement-breakpoint
-- Suporta o anti-join do claim: "o que este consumidor ainda não concluiu".
CREATE INDEX `eventos_processados_consumer_pending_idx` ON `eventos_processados` (`consumer_id`,`processed_at`);
