-- Migration: módulo financial — tabelas read-model Time Travel (fatia 2: timeline por-campo)
--
-- Gerado por: `pnpm exec drizzle-kit generate --config drizzle.config.financial.ts`
-- Editado manualmente para CHARSET/COLLATE:
--   Limitação Drizzle 0.45.x: não expõe charset/collate table-level (documentado em
--   `contracts/adapters/persistence/schemas/mysql.ts` §"CHARSET/COLLATE").
--   Regra (igual ao módulo contracts e migration 0000):
--     - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--     - Colunas UUID (id, event_id, document_id, target_id, actor_ref, timeline_entry_id):
--       COLLATE utf8mb4_bin (comparação binária — mais rápida para UUIDs)
--
-- FKs ON DELETE CASCADE:
--   fin_document_timeline.document_id → fin_documents.id (CASCADE): a trilha pertence
--     ao boundary do Document (Evans + data-model.md §"A delete operation must remove
--     everything within the AGGREGATE boundary at once").
--   fin_timeline_field_changes.timeline_entry_id → fin_document_timeline.id (CASCADE):
--     cascata dupla — changes ficam órfãs sem a entry, removidas juntas.

CREATE TABLE `fin_document_timeline` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`event_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`target_kind` varchar(8) NOT NULL,
	`target_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`event_type` varchar(40) NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`actor_ref` varchar(36) COLLATE utf8mb4_bin,
	CONSTRAINT `fin_document_timeline_id` PRIMARY KEY(`id`),
	CONSTRAINT `ck_fin_tl_target_kind` CHECK(`fin_document_timeline`.`target_kind` IN ('Document','Payable')),
	CONSTRAINT `ck_fin_tl_event_type` CHECK(`fin_document_timeline`.`event_type` IN ('DocumentSaved','PayableApproved','ApprovalUndone','DocumentCancelled','DocumentDraftSaved'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_timeline_field_changes` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`timeline_entry_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`field` varchar(60) NOT NULL,
	`before_value` text,
	`after_value` text,
	CONSTRAINT `fin_timeline_field_changes_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fin_document_timeline` ADD CONSTRAINT `fin_document_timeline_document_id_fk` FOREIGN KEY (`document_id`) REFERENCES `fin_documents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fin_timeline_field_changes` ADD CONSTRAINT `fin_timeline_field_changes_entry_id_fk` FOREIGN KEY (`timeline_entry_id`) REFERENCES `fin_document_timeline`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_fin_tl_doc_time` ON `fin_document_timeline` (`document_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `idx_fin_tl_target` ON `fin_document_timeline` (`target_id`);--> statement-breakpoint
CREATE INDEX `idx_fin_tlfc_entry` ON `fin_timeline_field_changes` (`timeline_entry_id`);