ALTER TABLE `fin_categories` ADD `cost_center_id` varchar(36);--> statement-breakpoint
CREATE INDEX `fin_categories_cost_center_id_idx` ON `fin_categories` (`cost_center_id`);