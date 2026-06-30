-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em event_id/contractor_ref editados à mão
CREATE TABLE `par_contract_count_processed` (
	`event_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`processed_at` datetime(3) NOT NULL,
	CONSTRAINT `par_contract_count_processed_event_id` PRIMARY KEY(`event_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `par_contract_count_view` (
	`contractor_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`active_count` int NOT NULL DEFAULT 0,
	CONSTRAINT `par_contract_count_view_contractor_ref` PRIMARY KEY(`contractor_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
