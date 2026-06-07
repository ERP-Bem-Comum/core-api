ALTER TABLE `auth_user` ADD `name` varchar(128);--> statement-breakpoint
ALTER TABLE `auth_user` ADD `cpf` varchar(11);--> statement-breakpoint
ALTER TABLE `auth_user` ADD `telephone` varchar(13);--> statement-breakpoint
ALTER TABLE `auth_user` ADD `image_url` varchar(1024);--> statement-breakpoint
ALTER TABLE `auth_user` ADD `collaborator_id` varchar(64);