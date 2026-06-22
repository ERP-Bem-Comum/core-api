ALTER TABLE `fin_categories` ADD `parent_id` varchar(36);--> statement-breakpoint
CREATE INDEX `fin_categories_parent_id_idx` ON `fin_categories` (`parent_id`);