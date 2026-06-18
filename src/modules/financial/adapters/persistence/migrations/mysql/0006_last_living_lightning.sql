-- Migration: módulo financial — US2/3/4 conciliação: fin_reconciliations + fin_reconciliation_items + fin_rejected_suggestions
--
-- Gerado por: `pnpm run db:generate:financial`
-- Editado manualmente para CHARSET/COLLATE (limitação Drizzle 0.45.x — igual às migrations 0000–0005):
--   - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--   - Colunas de identidade (id, *_id, *_by): COLLATE utf8mb4_bin (FK-match binário + comparação estável)
CREATE TABLE `fin_reconciliation_items` (
	`reconciliation_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`payable_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`reconciled_value_cents` bigint NOT NULL,
	CONSTRAINT `fin_reconciliation_items_reconciliation_id_payable_id_pk` PRIMARY KEY(`reconciliation_id`,`payable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_reconciliations` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`transaction_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`type` varchar(12) NOT NULL,
	`status` varchar(8) NOT NULL,
	`difference_value_cents` bigint,
	`difference_treatment` varchar(10),
	`reconciled_at` datetime(3) NOT NULL,
	`reconciled_by` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`undone_at` datetime(3),
	`undone_by` varchar(36) COLLATE utf8mb4_bin,
	`undo_reason` varchar(500),
	CONSTRAINT `fin_reconciliations_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_reconciliations_type_chk` CHECK(`fin_reconciliations`.`type` IN ('Individual','Multiple','Partial')),
	CONSTRAINT `fin_reconciliations_status_chk` CHECK(`fin_reconciliations`.`status` IN ('Active','Undone')),
	CONSTRAINT `fin_reconciliations_difference_chk` CHECK((`fin_reconciliations`.`difference_value_cents` IS NULL AND `fin_reconciliations`.`difference_treatment` IS NULL) OR (`fin_reconciliations`.`difference_value_cents` IS NOT NULL AND `fin_reconciliations`.`difference_treatment` IN ('Interest','Penalty','Discount','Fee','Partial')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_rejected_suggestions` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`transaction_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`payable_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`rejected_at` datetime(3) NOT NULL,
	`rejected_by` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	CONSTRAINT `fin_rejected_suggestions_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_rejected_suggestions_tx_payable_uq` UNIQUE(`transaction_id`,`payable_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fin_reconciliation_items` ADD CONSTRAINT `fin_reconciliation_items_reconciliation_id_fk` FOREIGN KEY (`reconciliation_id`) REFERENCES `fin_reconciliations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fin_reconciliation_items_payable_id_idx` ON `fin_reconciliation_items` (`payable_id`);--> statement-breakpoint
CREATE INDEX `fin_reconciliations_transaction_id_idx` ON `fin_reconciliations` (`transaction_id`);
