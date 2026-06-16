-- #43 — par_invite_tokens (autocadastro do colaborador). Espelha auth_password_reset.
-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em id/collaborator_id/token_hash
-- editados à mão (drizzle-kit 0.45.x não emite charset/collate). Ver schemas/mysql.ts §CHARSET.
CREATE TABLE `par_invite_tokens` (
	`id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`collaborator_id` varchar(36) NOT NULL COLLATE utf8mb4_bin,
	`token_hash` char(64) NOT NULL COLLATE utf8mb4_bin,
	`requested_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	CONSTRAINT `par_invite_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_invite_tokens_token_hash_idx` UNIQUE(`token_hash`),
	CONSTRAINT `par_invite_tokens_expiry_chk` CHECK(`par_invite_tokens`.`expires_at` > `par_invite_tokens`.`requested_at`),
	CONSTRAINT `par_invite_tokens_hash_nonempty_chk` CHECK(CHAR_LENGTH(`par_invite_tokens`.`token_hash`) > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
ALTER TABLE `par_invite_tokens` ADD CONSTRAINT `par_it_collaborator_fk` FOREIGN KEY (`collaborator_id`) REFERENCES `par_collaborators`(`id`) ON DELETE restrict ON UPDATE restrict;--> statement-breakpoint
CREATE INDEX `par_invite_tokens_collab_used_idx` ON `par_invite_tokens` (`collaborator_id`,`used_at`);
