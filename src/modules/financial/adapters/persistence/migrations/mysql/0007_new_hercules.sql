-- Migration: módulo financial — US5 lançamento manual: fin_manual_entries + libera type 'ManualEntry' em fin_reconciliations
--
-- Gerado por: `pnpm run db:generate:financial`
-- Editado manualmente para CHARSET/COLLATE (limitação Drizzle 0.45.x — igual às migrations 0000–0006):
--   - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--   - Colunas de identidade (id, reconciliation_id, *_ref): COLLATE utf8mb4_bin
CREATE TABLE `fin_manual_entries` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`reconciliation_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`type` varchar(24) NOT NULL,
	`value_cents` bigint NOT NULL,
	`supplier_ref` varchar(36) COLLATE utf8mb4_bin,
	`category_ref` varchar(36) COLLATE utf8mb4_bin,
	`cost_center_ref` varchar(36) COLLATE utf8mb4_bin,
	`program_ref` varchar(36) COLLATE utf8mb4_bin,
	`description` varchar(500),
	CONSTRAINT `fin_manual_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_manual_entries_type_chk` CHECK(`fin_manual_entries`.`type` IN ('Payment','Receipt','Transfer','FeePenaltyInterest','Investment','Redemption')),
	CONSTRAINT `fin_manual_entries_value_chk` CHECK(`fin_manual_entries`.`value_cents` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fin_reconciliations` DROP CONSTRAINT `fin_reconciliations_type_chk`;--> statement-breakpoint
ALTER TABLE `fin_manual_entries` ADD CONSTRAINT `fin_manual_entries_reconciliation_id_fk` FOREIGN KEY (`reconciliation_id`) REFERENCES `fin_reconciliations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fin_manual_entries_reconciliation_id_idx` ON `fin_manual_entries` (`reconciliation_id`);--> statement-breakpoint
ALTER TABLE `fin_reconciliations` ADD CONSTRAINT `fin_reconciliations_type_chk` CHECK (`fin_reconciliations`.`type` IN ('Individual','Multiple','Partial','ManualEntry'));
