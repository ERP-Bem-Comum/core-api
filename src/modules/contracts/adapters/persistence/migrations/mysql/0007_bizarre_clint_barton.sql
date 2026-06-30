ALTER TABLE `ctr_contracts` ADD `contractor_type` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `contractor_id` varchar(36) NOT NULL COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `observations` varchar(1000);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `email` varchar(255);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `telephone` varchar(32);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_contractor_type_chk` CHECK (`ctr_contracts`.`contractor_type` IN ('supplier','financier','collaborator','act'));