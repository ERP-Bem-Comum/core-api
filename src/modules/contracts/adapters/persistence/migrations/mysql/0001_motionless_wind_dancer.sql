CREATE TABLE `ctr_outbox` (
	`event_id` char(36) NOT NULL COLLATE utf8mb4_bin,
	`aggregate_id` char(36) NOT NULL COLLATE utf8mb4_bin,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` smallint NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	`attempts` smallint NOT NULL DEFAULT 0,
	`payload` varchar(8192) NOT NULL,
	CONSTRAINT `ctr_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `ctr_outbox_attempts_nonneg_chk` CHECK(`ctr_outbox`.`attempts` >= 0),
	CONSTRAINT `ctr_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`ctr_outbox`.`event_type`) > 0),
	CONSTRAINT `ctr_outbox_aggregate_type_chk` CHECK(`ctr_outbox`.`aggregate_type` IN ('Contract', 'Amendment'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `ctr_outbox_dead_letter` (
	`event_id` char(36) NOT NULL COLLATE utf8mb4_bin,
	`aggregate_id` char(36) NOT NULL COLLATE utf8mb4_bin,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` smallint NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`failed_at` datetime(3) NOT NULL,
	`attempts` smallint NOT NULL,
	`last_error` varchar(2048) NOT NULL,
	`payload` varchar(8192) NOT NULL,
	CONSTRAINT `ctr_outbox_dead_letter_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `ctr_outbox_dlq_aggregate_type_chk` CHECK(`ctr_outbox_dead_letter`.`aggregate_type` IN ('Contract', 'Amendment'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `eventos_processados` (
	`consumer_id` varchar(64) NOT NULL,
	`event_id` char(36) NOT NULL COLLATE utf8mb4_bin,
	`processed_at` datetime(3) NOT NULL,
	CONSTRAINT `eventos_processados_consumer_id_event_id_pk` PRIMARY KEY(`consumer_id`,`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `ctr_outbox_processed_at_occurred_at_idx` ON `ctr_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ctr_outbox_aggregate_id_idx` ON `ctr_outbox` (`aggregate_id`);--> statement-breakpoint
CREATE INDEX `ctr_outbox_dlq_failed_at_idx` ON `ctr_outbox_dead_letter` (`failed_at`);--> statement-breakpoint
CREATE INDEX `eventos_processados_processed_at_idx` ON `eventos_processados` (`processed_at`);