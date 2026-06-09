-- ADR-0020/0014: ENGINE/charset por tabela + COLLATE utf8mb4_bin em colunas UUID
-- (id/event_id/aggregate_id) editados a mao (drizzle-kit 0.45.x nao expoe charset/collate).
CREATE TABLE `prg_outbox` (
	`event_id` char(36) COLLATE utf8mb4_bin NOT NULL,
	`aggregate_id` char(36) COLLATE utf8mb4_bin NOT NULL,
	`aggregate_type` varchar(32) NOT NULL,
	`event_type` varchar(64) NOT NULL,
	`schema_version` smallint NOT NULL,
	`occurred_at` datetime(3) NOT NULL,
	`enqueued_at` datetime(3) NOT NULL,
	`processed_at` datetime(3),
	`attempts` smallint NOT NULL DEFAULT 0,
	`payload` varchar(8192) NOT NULL,
	CONSTRAINT `prg_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `prg_outbox_attempts_nonneg_chk` CHECK(`prg_outbox`.`attempts` >= 0),
	CONSTRAINT `prg_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`prg_outbox`.`event_type`) > 0),
	CONSTRAINT `prg_outbox_aggregate_type_chk` CHECK(`prg_outbox`.`aggregate_type` IN ('Program'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `prg_programs` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`program_number` bigint NOT NULL,
	`name` varchar(255) NOT NULL,
	`sigla` varchar(20) NOT NULL,
	`director` varchar(255),
	`general_characteristics` varchar(2000),
	`logo_key` varchar(512),
	`status` varchar(16) NOT NULL,
	`version` int NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `prg_programs_id` PRIMARY KEY(`id`),
	CONSTRAINT `prg_programs_number_uq` UNIQUE(`program_number`),
	CONSTRAINT `prg_programs_sigla_uq` UNIQUE(`sigla`),
	CONSTRAINT `prg_programs_status_chk` CHECK(`prg_programs`.`status` IN ('ATIVO','INATIVO')),
	CONSTRAINT `prg_programs_version_positive_chk` CHECK(`prg_programs`.`version` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `prg_outbox_processed_at_occurred_at_idx` ON `prg_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `prg_outbox_aggregate_id_idx` ON `prg_outbox` (`aggregate_id`);--> statement-breakpoint
CREATE INDEX `prg_programs_status_idx` ON `prg_programs` (`status`);--> statement-breakpoint
CREATE INDEX `prg_programs_name_idx` ON `prg_programs` (`name`);
