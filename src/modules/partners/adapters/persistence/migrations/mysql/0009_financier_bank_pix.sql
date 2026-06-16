ALTER TABLE `par_financiers` ADD `bank_account_bank` varchar(50);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD `bank_account_agency` varchar(20);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD `bank_account_number` varchar(30);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD `bank_account_check_digit` varchar(5);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD `pix_key_type` varchar(20);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD `pix_key` varchar(255);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD CONSTRAINT `par_financiers_bank_block_chk` CHECK((`par_financiers`.`bank_account_bank` IS NULL) = (`par_financiers`.`bank_account_agency` IS NULL)
        AND (`par_financiers`.`bank_account_bank` IS NULL) = (`par_financiers`.`bank_account_number` IS NULL)
        AND (`par_financiers`.`bank_account_bank` IS NULL) = (`par_financiers`.`bank_account_check_digit` IS NULL));--> statement-breakpoint
ALTER TABLE `par_financiers` ADD CONSTRAINT `par_financiers_pix_block_chk` CHECK((`par_financiers`.`pix_key_type` IS NULL) = (`par_financiers`.`pix_key` IS NULL));
