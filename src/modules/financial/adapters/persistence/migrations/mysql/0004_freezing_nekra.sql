-- Migration: módulo financial — fatia D-CEDENTE (conta-cedente + fin_documents.debit_account_ref)
--
-- Gerado por: `pnpm run db:generate:financial`
-- Editado manualmente para CHARSET/COLLATE (limitação Drizzle 0.45.x — igual às migrations 0000–0003):
--   - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--   - Colunas UUID (id, debit_account_ref): COLLATE utf8mb4_bin (comparação binária; FK-match estável)
CREATE TABLE `fin_cedente_accounts` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`bank_code` varchar(8) NOT NULL,
	`agency` varchar(12) NOT NULL,
	`account_number` varchar(20) NOT NULL,
	`account_digit` varchar(4) NOT NULL,
	`convenio` varchar(30) NOT NULL,
	`document` varchar(20) NOT NULL,
	`status` varchar(8) NOT NULL,
	`next_nsa` int NOT NULL,
	CONSTRAINT `fin_cedente_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_cedente_accounts_status_chk` CHECK(`fin_cedente_accounts`.`status` IN ('Active','Closed')),
	CONSTRAINT `fin_cedente_accounts_next_nsa_chk` CHECK(`fin_cedente_accounts`.`next_nsa` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `fin_documents` ADD `debit_account_ref` varchar(36) COLLATE utf8mb4_bin;
