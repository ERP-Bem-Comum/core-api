ALTER TABLE `fin_documents` ADD `issue_date` date;--> statement-breakpoint
CREATE INDEX `fin_documents_issue_date_idx` ON `fin_documents` (`issue_date`);