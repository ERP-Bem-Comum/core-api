-- ADR-0020/0014/0018: ENGINE/charset e COLLATE utf8mb4_bin em colunas UUID editados à mão
-- (drizzle-kit 0.45.x não emite charset/collate). Ver schemas/mysql.ts §CHARSET.
-- #44 — histórico append-only de alterações do Colaborador. Snapshot genérico before/after (text,
-- NÃO JSON), change_type varchar + CHECK (NÃO ENUM), PK UUID de domínio (sem AUTO_INCREMENT),
-- sem FK cross-agregado (referência por ID), índice (collaborator_ref, occurred_at) para a consulta.
CREATE TABLE `par_collaborator_history` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`collaborator_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`change_type` varchar(20) NOT NULL,
	`snapshot_before` text,
	`snapshot_after` text NOT NULL,
	`changed_by_ref` varchar(36) COLLATE utf8mb4_bin,
	`occurred_at` datetime(3) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `par_collaborator_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_collaborator_history_change_type_chk` CHECK(`par_collaborator_history`.`change_type` IN ('Cadastro','Complementacao','Edicao','Desativacao','Reativacao'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `par_ch_collaborator_occurred_idx` ON `par_collaborator_history` (`collaborator_ref`,`occurred_at`);
