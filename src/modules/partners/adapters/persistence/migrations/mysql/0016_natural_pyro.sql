-- ADR-0020/0014/0015: ENGINE/charset e COLLATE utf8mb4_bin em event_id/aggregate_id editados à mão.
-- par_email_outbox — outbox de e-mail dedicado do partners (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047).
CREATE TABLE `par_email_outbox` (
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
	CONSTRAINT `par_email_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `par_email_outbox_attempts_nonneg_chk` CHECK(`par_email_outbox`.`attempts` >= 0),
	CONSTRAINT `par_email_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`par_email_outbox`.`event_type`) > 0),
	CONSTRAINT `par_email_outbox_aggregate_type_chk` CHECK(`par_email_outbox`.`aggregate_type` IN ('Collaborator'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `par_email_outbox_processed_at_occurred_at_idx` ON `par_email_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `par_email_outbox_aggregate_id_idx` ON `par_email_outbox` (`aggregate_id`);
