ALTER TABLE `fin_documents` ADD `source_file_bucket` varchar(63);--> statement-breakpoint
ALTER TABLE `fin_documents` ADD `source_file_key` varchar(1024);--> statement-breakpoint
ALTER TABLE `fin_documents` ADD `source_file_hash_sha256` varchar(64);--> statement-breakpoint
ALTER TABLE `fin_documents` ADD `source_file_size_bytes` bigint;--> statement-breakpoint
ALTER TABLE `fin_documents` ADD `source_file_mime` varchar(127);