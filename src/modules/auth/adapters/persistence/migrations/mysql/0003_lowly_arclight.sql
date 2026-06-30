ALTER TABLE `auth_user` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `auth_user` ADD CONSTRAINT `auth_user_legacy_id_idx` UNIQUE(`legacy_id`);