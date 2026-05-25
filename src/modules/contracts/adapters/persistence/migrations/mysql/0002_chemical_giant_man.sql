CREATE TABLE `ctr_documents` (
	`id` char(36) NOT NULL,
	`parent_type` varchar(16) NOT NULL,
	`parent_id` char(36) NOT NULL,
	`categoria` varchar(32) NOT NULL,
	`file_name` varchar(255) NOT NULL,
	`mime_type` varchar(127) NOT NULL,
	`size_bytes` bigint NOT NULL,
	`hash_sha256` char(64) NOT NULL,
	`bucket` varchar(63) NOT NULL,
	`storage_key` varchar(1024) NOT NULL,
	`signed_electronically` boolean NOT NULL DEFAULT false,
	`version` smallint unsigned NOT NULL DEFAULT 1,
	`uploaded_at` datetime(3) NOT NULL,
	`uploaded_by` char(36) NOT NULL,
	`retention_until` datetime(3),
	`status` varchar(16) NOT NULL DEFAULT 'Active',
	CONSTRAINT `ctr_documents_id` PRIMARY KEY(`id`),
	CONSTRAINT `ctr_documents_parent_type_chk` CHECK(`ctr_documents`.`parent_type` IN ('Contract','Amendment')),
	CONSTRAINT `ctr_documents_status_chk` CHECK(`ctr_documents`.`status` IN ('Active','LogicallyDeleted','Superseded')),
	CONSTRAINT `ctr_documents_categoria_chk` CHECK(`ctr_documents`.`categoria` IN ('signed_contract','signed_amendment','opinion','certificate','justification','technical_attachment','publication','other')),
	CONSTRAINT `ctr_documents_size_chk` CHECK(`ctr_documents`.`size_bytes` >= 0),
	CONSTRAINT `ctr_documents_version_chk` CHECK(`ctr_documents`.`version` >= 1)
);
--> statement-breakpoint
ALTER TABLE `ctr_outbox` DROP CONSTRAINT `ctr_outbox_aggregate_type_chk`;--> statement-breakpoint
ALTER TABLE `ctr_outbox_dead_letter` DROP CONSTRAINT `ctr_outbox_dlq_aggregate_type_chk`;--> statement-breakpoint
CREATE INDEX `ctr_documents_parent_idx` ON `ctr_documents` (`parent_type`,`parent_id`);--> statement-breakpoint
CREATE INDEX `ctr_documents_hash_idx` ON `ctr_documents` (`hash_sha256`);--> statement-breakpoint
CREATE INDEX `ctr_documents_status_uploaded_idx` ON `ctr_documents` (`status`,`uploaded_at`);--> statement-breakpoint
ALTER TABLE `ctr_outbox` ADD CONSTRAINT `ctr_outbox_aggregate_type_chk` CHECK (`ctr_outbox`.`aggregate_type` IN ('Contract', 'Amendment', 'Document'));--> statement-breakpoint
ALTER TABLE `ctr_outbox_dead_letter` ADD CONSTRAINT `ctr_outbox_dlq_aggregate_type_chk` CHECK (`ctr_outbox_dead_letter`.`aggregate_type` IN ('Contract', 'Amendment', 'Document'));