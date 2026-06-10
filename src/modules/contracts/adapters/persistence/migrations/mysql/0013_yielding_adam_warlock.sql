ALTER TABLE `ctr_contracts` ADD `classification` varchar(8) DEFAULT 'CT' NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `program_id` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `budget_plan_id` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `categorizacao` varchar(255);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD `centro_de_custo` varchar(255);--> statement-breakpoint
ALTER TABLE `ctr_contracts` ADD CONSTRAINT `ctr_contracts_classification_chk` CHECK (`ctr_contracts`.`classification` IN ('CT','OS'));