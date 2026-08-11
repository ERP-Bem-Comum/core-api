-- fin_remittances + fin_remittance_documents (016 / ADR-0061).
--
-- ENGINE/CHARSET inseridos MANUALMENTE: o drizzle-kit 0.45.x não os emite, e sem eles a tabela
-- herda o default do servidor — que difere entre a instância de dev e a de produção. As demais
-- migrations deste módulo fazem o mesmo (ver 0000, 0001, 0003).
--
-- A coluna `id` já sai em utf8mb4_bin pelo helper `uuidKey`: comparação de UUID é byte a byte.

CREATE TABLE `fin_remittance_documents` (
	`remittance_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`document_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	CONSTRAINT `fin_remittance_documents_remittance_id_document_id_pk` PRIMARY KEY(`remittance_id`,`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_remittances` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`cedente_account_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`nsa` int NOT NULL,
	`file_name` varchar(128) NOT NULL,
	`content_hash` varchar(64) NOT NULL,
	`status` varchar(16) NOT NULL,
	`generated_at` datetime(3) NOT NULL,
	`settled_at` datetime(3),
	`detail` varchar(512),
	CONSTRAINT `fin_remittances_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_remittances_account_nsa_uq` UNIQUE(`cedente_account_id`,`nsa`),
	CONSTRAINT `fin_remittances_file_name_uq` UNIQUE(`file_name`),
	CONSTRAINT `fin_remittances_status_chk` CHECK(`fin_remittances`.`status` IN ('Queued','Transmitted','Failed','Discarded')),
	CONSTRAINT `fin_remittances_nsa_range_chk` CHECK(`fin_remittances`.`nsa` >= 1 AND `fin_remittances`.`nsa` <= 999999)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `fin_remittance_documents_document_idx` ON `fin_remittance_documents` (`document_id`);--> statement-breakpoint
CREATE INDEX `fin_remittances_status_idx` ON `fin_remittances` (`status`);