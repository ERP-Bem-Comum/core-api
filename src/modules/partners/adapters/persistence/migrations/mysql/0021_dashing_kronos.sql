ALTER TABLE `par_collaborator_history` ADD `changed_by_user_id` varchar(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `par_collaborator_history` ADD `changed_by_name` varchar(128);