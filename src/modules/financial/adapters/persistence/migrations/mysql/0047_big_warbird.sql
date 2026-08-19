-- fin_van_return_quarantine (#753 / ADR-0061).
--
-- ENGINE/CHARSET inseridos MANUALMENTE: o drizzle-kit 0.45.x não os emite, e sem eles a tabela
-- herda o default do servidor — que difere entre a instância de dev e a de produção. As demais
-- migrations deste módulo fazem o mesmo (ver 0000, 0001, 0003, 0044).
--
-- `object_key`, `observed_sha256` e `expected_sha256` já saem em utf8mb4_bin pelos helpers
-- `objectStorageKey`/`sha256HexKey`: chave de S3 é case-sensitive e hash se compara byte a byte.

CREATE TABLE `fin_van_return_quarantine` (
	`object_key` varchar(255) COLLATE utf8mb4_bin NOT NULL,
	`reason` varchar(32) NOT NULL,
	`observed_sha256` char(64) COLLATE utf8mb4_bin NOT NULL,
	`expected_sha256` char(64) COLLATE utf8mb4_bin,
	`first_seen_at` datetime(3) NOT NULL,
	`last_seen_at` datetime(3) NOT NULL,
	`released_at` datetime(3),
	CONSTRAINT `fin_van_return_quarantine_object_key` PRIMARY KEY(`object_key`),
	CONSTRAINT `fin_van_return_quarantine_reason_chk` CHECK(`fin_van_return_quarantine`.`reason` IN ('missing-provenance','hash-mismatch','origin-not-logged'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `fin_van_return_quarantine_released_idx` ON `fin_van_return_quarantine` (`released_at`);
