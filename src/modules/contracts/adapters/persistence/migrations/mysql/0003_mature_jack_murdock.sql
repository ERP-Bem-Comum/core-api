ALTER TABLE `ctr_documents` ADD `deleted_at` datetime(3);--> statement-breakpoint
ALTER TABLE `ctr_documents` ADD `deleted_by` char(36);--> statement-breakpoint
ALTER TABLE `ctr_documents` ADD `deleted_reason` varchar(500);--> statement-breakpoint
ALTER TABLE `ctr_documents` ADD CONSTRAINT `ctr_documents_logically_deleted_chk` CHECK (`ctr_documents`.`status` <> 'LogicallyDeleted'
          OR (`ctr_documents`.`deleted_at` IS NOT NULL AND `ctr_documents`.`deleted_by` IS NOT NULL AND `ctr_documents`.`deleted_reason` IS NOT NULL));