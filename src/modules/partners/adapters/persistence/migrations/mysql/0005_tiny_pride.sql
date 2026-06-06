CREATE TABLE `par_municipalities` (
	`ibge_code` varchar(7) NOT NULL,
	`uf` varchar(2) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`deactivated_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `par_municipalities_ibge_code` PRIMARY KEY(`ibge_code`),
	CONSTRAINT `par_municipalities_active_consistency_chk` CHECK((`par_municipalities`.`active` = FALSE) = (`par_municipalities`.`deactivated_at` IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE `par_states` (
	`uf` varchar(2) NOT NULL,
	`active` boolean NOT NULL DEFAULT true,
	`deactivated_at` datetime(3),
	`created_at` datetime(3) NOT NULL,
	`updated_at` datetime(3) NOT NULL,
	CONSTRAINT `par_states_uf` PRIMARY KEY(`uf`),
	CONSTRAINT `par_states_active_consistency_chk` CHECK((`par_states`.`active` = FALSE) = (`par_states`.`deactivated_at` IS NOT NULL))
);
