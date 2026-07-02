ALTER TABLE `prg_programs` ADD `legacy_id` int;--> statement-breakpoint
ALTER TABLE `prg_programs` ADD CONSTRAINT `prg_programs_legacy_id_idx` UNIQUE(`legacy_id`);