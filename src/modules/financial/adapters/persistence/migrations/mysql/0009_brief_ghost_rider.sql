ALTER TABLE `fin_cedente_accounts` ADD `type` varchar(16);--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD `nickname` varchar(120);--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD `bank_name` varchar(120);--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD `opening_balance_cents` bigint;--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD `opening_balance_date` date;--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD CONSTRAINT `fin_cedente_accounts_natural_key_uq` UNIQUE(`bank_code`,`agency`,`account_number`,`account_digit`);--> statement-breakpoint
ALTER TABLE `fin_cedente_accounts` ADD CONSTRAINT `fin_cedente_accounts_type_chk` CHECK (`fin_cedente_accounts`.`type` IS NULL OR `fin_cedente_accounts`.`type` IN ('corrente','poupanca','investimento'));