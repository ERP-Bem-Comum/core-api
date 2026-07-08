-- ADR-0020/0014: ENGINE/charset por tabela + COLLATE utf8mb4_bin em colunas UUID
-- (id/program_ref/budget_plan_id/partner_ref/event_id/aggregate_id) editados a mao
-- (drizzle-kit 0.31.x nao expoe charset/collate).
CREATE TABLE `bgp_outbox` (
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
	CONSTRAINT `bgp_outbox_event_id` PRIMARY KEY(`event_id`),
	CONSTRAINT `bgp_outbox_attempts_nonneg_chk` CHECK(`bgp_outbox`.`attempts` >= 0),
	CONSTRAINT `bgp_outbox_event_type_nonempty_chk` CHECK(CHAR_LENGTH(`bgp_outbox`.`event_type`) > 0),
	CONSTRAINT `bgp_outbox_aggregate_type_chk` CHECK(`bgp_outbox`.`aggregate_type` IN ('BudgetPlan'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `bgp_budget_plans` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`year` int NOT NULL,
	`program_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`version_major` int NOT NULL,
	`version_minor` int NOT NULL,
	`status` varchar(16) NOT NULL,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `bgp_budget_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `bgp_budget_plans_year_program_ref_uq` UNIQUE(`year`,`program_ref`),
	CONSTRAINT `bgp_budget_plans_status_chk` CHECK(`bgp_budget_plans`.`status` IN ('RASCUNHO','EM_CALIBRACAO','APROVADO'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `bgp_budgets` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`budget_plan_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`partner_kind` varchar(16) NOT NULL,
	`partner_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`value_cents` bigint NOT NULL,
	CONSTRAINT `bgp_budgets_id` PRIMARY KEY(`id`),
	CONSTRAINT `bgp_budgets_budget_plan_id_partner_kind_partner_ref_uq` UNIQUE(`budget_plan_id`,`partner_kind`,`partner_ref`),
	CONSTRAINT `bgp_budgets_partner_kind_chk` CHECK(`bgp_budgets`.`partner_kind` IN ('state','municipality'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `bgp_budgets` ADD CONSTRAINT `bgp_budgets_budget_plan_id_fk` FOREIGN KEY (`budget_plan_id`) REFERENCES `bgp_budget_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bgp_outbox_processed_at_occurred_at_idx` ON `bgp_outbox` (`processed_at`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `bgp_outbox_aggregate_id_idx` ON `bgp_outbox` (`aggregate_id`);--> statement-breakpoint
CREATE INDEX `bgp_budget_plans_status_idx` ON `bgp_budget_plans` (`status`);