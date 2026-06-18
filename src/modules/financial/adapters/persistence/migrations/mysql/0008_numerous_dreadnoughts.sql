-- Migration: módulo financial — US6 fechamento de período: fin_reconciliation_periods
--
-- Gerado por: `pnpm run db:generate:financial`
-- Editado manualmente para CHARSET/COLLATE (limitação Drizzle 0.45.x — igual às migrations 0000–0007):
--   - Por tabela: ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
--   - Colunas de identidade (id, debit_account_ref, closed_by): COLLATE utf8mb4_bin
CREATE TABLE `fin_reconciliation_periods` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`debit_account_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`period_start` date NOT NULL,
	`period_end` date NOT NULL,
	`status` varchar(8) NOT NULL,
	`closed_at` datetime(3),
	`closed_by` varchar(36) COLLATE utf8mb4_bin,
	CONSTRAINT `fin_reconciliation_periods_id` PRIMARY KEY(`id`),
	CONSTRAINT `fin_reconciliation_periods_account_range_uq` UNIQUE(`debit_account_ref`,`period_start`,`period_end`),
	CONSTRAINT `fin_reconciliation_periods_status_chk` CHECK(`fin_reconciliation_periods`.`status` IN ('Open','Closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
