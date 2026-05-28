CREATE TABLE `auth_permission` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`name` varchar(128) NOT NULL COLLATE utf8mb4_bin,
	`created_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_permission_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_permission_name_idx` UNIQUE(`name`),
	CONSTRAINT `auth_permission_name_format_chk` CHECK(REGEXP_LIKE(`auth_permission`.`name`, '^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `auth_refresh_token` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`user_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`token_hash` char(64) NOT NULL COLLATE utf8mb4_bin,
	`issued_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`revoked_at` datetime(3),
	`replaced_by` varchar(36) COLLATE utf8mb4_bin,
	CONSTRAINT `auth_refresh_token_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_rt_token_hash_idx` UNIQUE(`token_hash`),
	CONSTRAINT `auth_rt_expiry_chk` CHECK(`auth_refresh_token`.`expires_at` > `auth_refresh_token`.`issued_at`),
	CONSTRAINT `auth_rt_hash_nonempty_chk` CHECK(CHAR_LENGTH(`auth_refresh_token`.`token_hash`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `auth_role` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`name` varchar(64) NOT NULL,
	`description` varchar(255),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_role_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_role_name_idx` UNIQUE(`name`),
	CONSTRAINT `auth_role_name_nonempty_chk` CHECK(CHAR_LENGTH(`auth_role`.`name`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `auth_role_permission` (
	`role_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`permission_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	CONSTRAINT `auth_role_permission_role_id_permission_id_pk` PRIMARY KEY(`role_id`,`permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `auth_user` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`email` varchar(254) NOT NULL,
	`password_hash` varchar(255),
	`status` varchar(16) NOT NULL,
	`disabled_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_user_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_user_email_idx` UNIQUE(`email`),
	CONSTRAINT `auth_user_status_chk` CHECK(`auth_user`.`status` IN ('active','disabled')),
	CONSTRAINT `auth_user_disabled_consistency_chk` CHECK((`auth_user`.`status` = 'disabled') = (`auth_user`.`disabled_at` IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE TABLE `auth_user_role` (
	`user_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`role_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`assigned_at` datetime(3) NOT NULL,
	CONSTRAINT `auth_user_role_user_id_role_id_pk` PRIMARY KEY(`user_id`,`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `auth_refresh_token` ADD CONSTRAINT `auth_rt_user_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `auth_role_permission` ADD CONSTRAINT `auth_rp_role_fk` FOREIGN KEY (`role_id`) REFERENCES `auth_role`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `auth_role_permission` ADD CONSTRAINT `auth_rp_permission_fk` FOREIGN KEY (`permission_id`) REFERENCES `auth_permission`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `auth_user_role` ADD CONSTRAINT `auth_urt_user_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
ALTER TABLE `auth_user_role` ADD CONSTRAINT `auth_urt_role_fk` FOREIGN KEY (`role_id`) REFERENCES `auth_role`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `auth_rt_user_revoked_idx` ON `auth_refresh_token` (`user_id`,`revoked_at`);--> statement-breakpoint
CREATE INDEX `auth_rp_permission_idx` ON `auth_role_permission` (`permission_id`);--> statement-breakpoint
CREATE INDEX `auth_urt_role_idx` ON `auth_user_role` (`role_id`);