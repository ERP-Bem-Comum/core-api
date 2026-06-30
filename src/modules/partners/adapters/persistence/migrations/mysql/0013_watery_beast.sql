CREATE TABLE `par_collaborator_history` (
	`id` varchar(36) NOT NULL,
	`collaborator_id` varchar(36) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`field_name` varchar(100) NOT NULL,
	`field_label` varchar(100) NOT NULL,
	`value_before` varchar(1000),
	`value_after` varchar(1000),
	`occurred_at` datetime(3) NOT NULL,
	CONSTRAINT `par_collaborator_history_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_collaborator_history_idem_idx` UNIQUE(`collaborator_id`,`occurred_at`,`field_name`)
);
--> statement-breakpoint
CREATE INDEX `par_collaborator_history_collab_date_idx` ON `par_collaborator_history` (`collaborator_id`,`occurred_at`);