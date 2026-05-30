CREATE TABLE `auth_login_lockout` (
	`user_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`failed_attempts` int NOT NULL,
	`locked_until` datetime(3),
	CONSTRAINT `auth_login_lockout_user_id` PRIMARY KEY(`user_id`),
	CONSTRAINT `auth_ll_attempts_chk` CHECK(`auth_login_lockout`.`failed_attempts` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `auth_login_lockout` ADD CONSTRAINT `auth_ll_user_fk` FOREIGN KEY (`user_id`) REFERENCES `auth_user`(`id`) ON DELETE restrict ON UPDATE restrict;