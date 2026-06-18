-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em event_id/aggregate_id editados à mão
-- (limitação Drizzle 0.45.x — ver cabeçalho de schemas/mysql.ts).
CREATE TABLE `notifications_email_outbox` (
	`event_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`aggregate_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` smallint NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	`attempts` smallint NOT NULL DEFAULT 0,
	`payload` varchar(8192) NOT NULL,
	`idempotency_key` varchar(200) NOT NULL,
	CONSTRAINT `notifications_email_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `notifications_email_outbox_idem_idx` UNIQUE(`idempotency_key`),
	CONSTRAINT `notifications_email_outbox_attempts_nonneg_chk` CHECK(`notifications_email_outbox`.`attempts` >= 0),
	CONSTRAINT `notifications_email_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`notifications_email_outbox`.`event_type`) > 0),
	CONSTRAINT `notifications_email_outbox_aggregate_type_chk` CHECK(`notifications_email_outbox`.`aggregate_type` IN ('EmailMessage'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `notifications_email_outbox_dead_letter` (
	`event_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`aggregate_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` smallint NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`failed_at` datetime(3) NOT NULL,
	`attempts` smallint NOT NULL,
	`last_error` varchar(2048) NOT NULL,
	`payload` varchar(8192) NOT NULL,
	CONSTRAINT `notifications_email_outbox_dead_letter_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `notifications_email_outbox_dlq_aggregate_type_chk` CHECK(`notifications_email_outbox_dead_letter`.`aggregate_type` IN ('EmailMessage'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `notifications_email_outbox_processed_occurred_idx` ON `notifications_email_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `notifications_email_outbox_dlq_failed_at_idx` ON `notifications_email_outbox_dead_letter` (`failed_at`);