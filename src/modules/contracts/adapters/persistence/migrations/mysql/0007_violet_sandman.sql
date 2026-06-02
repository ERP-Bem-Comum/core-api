ALTER TABLE `ctr_contracts` ADD `contractor_type` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `contractor_id` varchar(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_contractor_type_chk` CHECK (`ctr_contracts`.`contractor_type` IN ('Supplier','Financier','Collaborator'));