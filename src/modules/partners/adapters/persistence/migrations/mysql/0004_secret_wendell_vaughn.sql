ALTER TABLE `par_collaborators` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `par_financiers` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `par_user_profiles` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD CONSTRAINT `par_collaborators_legacy_id_idx` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `par_financiers` ADD CONSTRAINT `par_financiers_legacy_id_idx` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD CONSTRAINT `par_suppliers_legacy_id_idx` UNIQUE(`legacy_id`);--> statement-breakpoint
ALTER TABLE `par_user_profiles` ADD CONSTRAINT `par_user_profiles_legacy_id_idx` UNIQUE(`legacy_id`);