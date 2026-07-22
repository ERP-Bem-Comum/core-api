CREATE TABLE `fin_outbox_dead_letter` (
	`event_id` varchar(36) NOT NULL,
	`aggregate_id` varchar(36) NOT NULL,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` int NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`failed_at` datetime(3) NOT NULL,
	`attempts` int NOT NULL,
	`last_error` varchar(2048) NOT NULL,
	`payload` varchar(8192) NOT NULL,
	CONSTRAINT `fin_outbox_dead_letter_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `fin_outbox_dl_attempts_nonneg_chk` CHECK(`fin_outbox_dead_letter`.`attempts` >= 0),
	CONSTRAINT `fin_outbox_dl_aggregate_type_chk` CHECK(`fin_outbox_dead_letter`.`aggregate_type` IN ('Document', 'Reconciliation', 'Statement', 'ReconciliationPeriod'))
);
--> statement-breakpoint
CREATE INDEX `fin_outbox_dl_failed_at_idx` ON `fin_outbox_dead_letter` (`failed_at`);