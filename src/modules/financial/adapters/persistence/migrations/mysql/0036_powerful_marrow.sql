ALTER TABLE `fin_expected_counterpart` DROP CONSTRAINT `fin_expected_counterpart_type_chk`;--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` ADD `product_label` varchar(120);--> statement-breakpoint
ALTER TABLE `fin_expected_counterpart` ADD CONSTRAINT `fin_expected_counterpart_type_chk` CHECK (`fin_expected_counterpart`.`type` IN ('Transfer','Investment','Redemption'));