-- ADR-0020/0014: ENGINE/charset e COLLATE utf8mb4_bin em user_ref/cpf/collaborator_ref
-- editados à mão (drizzle-kit 0.45.x não emite charset/collate). Ver schemas/mysql.ts §CHARSET.
CREATE TABLE `par_user_profiles` (
	`user_ref` varchar(36) COLLATE utf8mb4_bin NOT NULL,
	`name` varchar(255) NOT NULL,
	`cpf` varchar(11) COLLATE utf8mb4_bin NOT NULL,
	`telephone` varchar(30) NOT NULL,
	`avatar_url` varchar(500),
	`collaborator_ref` varchar(36) COLLATE utf8mb4_bin,
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `par_user_profiles_user_ref` PRIMARY KEY(`user_ref`),
	CONSTRAINT `par_user_profiles_cpf_idx` UNIQUE(`cpf`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
