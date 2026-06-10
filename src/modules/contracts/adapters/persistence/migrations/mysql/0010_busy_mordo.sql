CREATE TABLE `ctr_contract_seq` (
	`year` smallint unsigned NOT NULL,
	`last_seq` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `ctr_contract_seq_year` PRIMARY KEY(`year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
