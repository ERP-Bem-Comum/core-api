ALTER TABLE `ctr_amendments` MODIFY COLUMN `new_end_date` date;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `original_period_start` date NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `original_period_end` date;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `current_period_start` date NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_contracts` MODIFY COLUMN `current_period_end` date;