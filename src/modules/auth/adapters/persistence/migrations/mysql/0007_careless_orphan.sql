-- AUTH-DOMAIN-OUTBOX / ADR-0047: outbox de eventos de dominio do auth (dark-launch).
-- ADR-0020/0014/0015: ENGINE/charset e COLLATE utf8mb4_bin em event_id/aggregate_id editados a mao.
CREATE TABLE `auth_outbox` (
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
	CONSTRAINT `auth_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `auth_outbox_attempts_nonneg_chk` CHECK(`auth_outbox`.`attempts` >= 0),
	CONSTRAINT `auth_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`auth_outbox`.`event_type`) > 0),
	CONSTRAINT `auth_outbox_aggregate_type_chk` CHECK(`auth_outbox`.`aggregate_type` IN ('User'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `auth_outbox_processed_at_occurred_at_idx` ON `auth_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `auth_outbox_aggregate_id_idx` ON `auth_outbox` (`aggregate_id`);