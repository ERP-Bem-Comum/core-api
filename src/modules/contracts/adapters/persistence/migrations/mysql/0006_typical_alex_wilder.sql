ALTER TABLE `ctr_contracts` DROP CONSTRAINT `ctr_contracts_status_chk`;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `signed_at` datetime(3);--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `current_value_cents` bigint;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `current_period_kind` varchar(16);--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `current_period_start` date;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_pending_consistency_chk` CHECK ((`ctr_contracts`.`status` = 'Pending') = (`ctr_contracts`.`signed_at` IS NULL AND `ctr_contracts`.`current_value_cents` IS NULL AND `ctr_contracts`.`current_period_kind` IS NULL AND `ctr_contracts`.`current_period_start` IS NULL));--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_status_chk` CHECK (`ctr_contracts`.`status` IN ('Pending','Active','Expired','Terminated'));