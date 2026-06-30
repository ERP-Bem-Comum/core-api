CREATE TABLE `auth_password_reset` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`user_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`token_hash` char(64) NOT NULL COLLATE utf8mb4_bin,
	`requested_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	CONSTRAINT `auth_password_reset_id` PRIMARY KEY(`id`),
	CONSTRAINT `auth_pr_token_hash_idx` UNIQUE(`token_hash`),
	CONSTRAINT `auth_pr_expiry_chk` CHECK(`auth_password_reset`.`expires_at` > `auth_password_reset`.`requested_at`),
	CONSTRAINT `auth_pr_hash_nonempty_chk` CHECK(CHAR_LENGTH(`auth_password_reset`.`token_hash`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `auth_password_reset` ADD CONSTRAINT `auth_pr_user_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `auth_pr_user_used_idx` ON `auth_password_reset` (`user_id`,`used_at`);