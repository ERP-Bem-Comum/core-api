ALTER TABLE `fin_documents` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `fin_documents` ADD CONSTRAINT `fin_documents_legacy_id_uq` UNIQUE(`legacy_id`);