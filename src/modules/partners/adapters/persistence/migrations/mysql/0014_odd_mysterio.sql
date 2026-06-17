-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em id/collaborator_id/token_hash editados à mão
CREATE TABLE `par_invite_tokens` (
	`id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`collaborator_id` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`token_hash` varchar(64) COLLATE utf8mb4_bin NOT NULL,
	`issued_at` datetime(3) NOT NULL,
	`expires_at` datetime(3) NOT NULL,
	`used_at` datetime(3),
	CONSTRAINT `par_invite_tokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `par_invite_tokens_token_hash_idx` UNIQUE(`token_hash`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
--> statement-breakpoint
CREATE INDEX `par_invite_tokens_collaborator_idx` ON `par_invite_tokens` (`collaborator_id`);
