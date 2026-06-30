-- Migration: módulo contracts — coordenação de jobs one-shot (CTR-SWEEPER-JOB-LOCK / ADR-0041).
-- Editado manualmente para CHARSET/COLLATE (Drizzle não expõe table-level):
--   ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci.
CREATE TABLE `ctr_job_runs` (
	`job_name` varchar(64) NOT NULL,
	`run_key` varchar(64) NOT NULL,
	`started_at` datetime(3) NOT NULL,
	CONSTRAINT `ctr_job_runs_job_name_run_key_pk` PRIMARY KEY(`job_name`,`run_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
