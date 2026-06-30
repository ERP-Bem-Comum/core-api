ALTER TABLE `ctr_documents` ADD `superseded_at` datetime(3);--> statement-breakpoint
ALTER TABLE `ctr_documents` ADD `superseded_by` char(36);--> statement-breakpoint
ALTER TABLE `ctr_documents` ADD `superseded_by_document_id` char(36);--> statement-breakpoint
ALTER TABLE `ctr_documents` ADD CONSTRAINT `ctr_documents_superseded_chk` CHECK (`ctr_documents`.`status` <> 'Superseded'
          OR (`ctr_documents`.`superseded_at` IS NOT NULL
              AND `ctr_documents`.`superseded_by` IS NOT NULL
              AND `ctr_documents`.`superseded_by_document_id` IS NOT NULL));