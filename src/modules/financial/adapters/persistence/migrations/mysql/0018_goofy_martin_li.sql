CREATE TABLE `fin_outbox` (
	`event_id` varchar(36) NOT NULL,
	`aggregate_id` varchar(36) NOT NULL,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` int NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	`attempts` int NOT NULL DEFAULT 0,
	`payload` varchar(8192) NOT NULL,
	CONSTRAINT `fin_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `fin_outbox_attempts_nonneg_chk` CHECK(`fin_outbox`.`attempts` >= 0),
	CONSTRAINT `fin_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`fin_outbox`.`event_type`) > 0),
	CONSTRAINT `fin_outbox_aggregate_type_chk` CHECK(`fin_outbox`.`aggregate_type` IN ('Document', 'Reconciliation', 'Statement', 'ReconciliationPeriod'))
);
--> statement-breakpoint
CREATE INDEX `fin_outbox_processed_at_occurred_at_idx` ON `fin_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `fin_outbox_aggregate_id_idx` ON `fin_outbox` (`aggregate_id`);