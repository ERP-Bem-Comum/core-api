ALTER TABLE `ctr_documents` MODIFY COLUMN `deleted_by` char(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `ctr_documents` MODIFY COLUMN `superseded_by` char(36) COLLATE utf8mb4_bin;