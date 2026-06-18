-- Migration: módulo financial — US1 conciliação (extrato bancário): fin_bank_statements + fin_statement_transactions
--
-- Gerado por: `pnpm run db:generate:financial`
-- Editado manualmente para CHARSET/COLLATE (limitação Drizzle 0.45.x — igual às migrations 0000–0004):
--   - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--   - Colunas de identidade (id, statement_id, debit_account_ref): COLLATE utf8mb4_bin (FK-match binário estável)
--   - `fitid`: COLLATE utf8mb4_bin — é chave de anti-duplicidade (R5); comparação binária exata (case/acento-sensível)
--     garante que o índice ÚNICO `(debit_account_ref, fitid)` não colapse FITIDs distintos por collation.
CREATE TABLE `fin_bank_statements` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`debit_account_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`period_start` datetime(3) NOT NULL,
	`period_end` datetime(3) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`file_format` varchar(8) NOT NULL,
	`file_hash` varchar(64) NOT NULL,
	`opening_balance_cents` bigint NOT NULL,
	`closing_balance_cents` bigint NOT NULL,
	CONSTRAINT `fin_bank_statements_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_bank_statements_file_format_chk` CHECK(`fin_bank_statements`.`file_format` IN ('OFX','CSV'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `fin_statement_transactions` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`statement_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`debit_account_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`fitid` varchar(64) COLLATE utf8mb4_bin NOT NULL,
	`date` datetime(3) NOT NULL,
	`movement` varchar(8) NOT NULL,
	`entry_type` varchar(32) NOT NULL,
	`payee_name` varchar(255) NOT NULL,
	`memo` varchar(500) NOT NULL,
	`value_cents` bigint NOT NULL,
	`balance_after_cents` bigint NOT NULL,
	`reconciliation_status` varchar(12) NOT NULL,
	CONSTRAINT `fin_statement_transactions_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_statement_transactions_account_fitid_uq` UNIQUE(`debit_account_ref`,`fitid`),
	CONSTRAINT `fin_statement_transactions_movement_chk` CHECK(`fin_statement_transactions`.`movement` IN ('Debit','Credit')),
	CONSTRAINT `fin_statement_transactions_recon_status_chk` CHECK(`fin_statement_transactions`.`reconciliation_status` IN ('Pending','Reconciled','ManualEntry'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fin_statement_transactions` ADD CONSTRAINT `fin_statement_transactions_statement_id_fk` FOREIGN KEY (`statement_id`) REFERENCES `fin_bank_statements`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fin_bank_statements_debit_account_ref_idx` ON `fin_bank_statements` (`debit_account_ref`);--> statement-breakpoint
CREATE INDEX `fin_statement_transactions_statement_id_idx` ON `fin_statement_transactions` (`statement_id`);
