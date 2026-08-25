ALTER TABLE `ctr_documents` MODIFY COLUMN `id` char(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_documents` MODIFY COLUMN `parent_id` char(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_documents` MODIFY COLUMN `hash_sha256` char(64) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_documents` MODIFY COLUMN `uploaded_by` char(36) COLLATE utf8mb4_bin NOT NULL;--> statement-breakpoint
ALTER TABLE `ctr_documents` MODIFY COLUMN `superseded_by_document_id` char(36) COLLATE utf8mb4_bin;--> statement-breakpoint
ALTER TABLE `eventos_processados` MODIFY COLUMN `consumer_id` varchar(64) COLLATE utf8mb4_bin NOT NULL;