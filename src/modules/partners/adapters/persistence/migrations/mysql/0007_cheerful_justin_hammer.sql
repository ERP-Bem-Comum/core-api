ALTER TABLE `par_suppliers` ADD `service_rating` varchar(16);--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD `rating_comment` varchar(1000);--> statement-breakpoint
ALTER TABLE `par_suppliers` ADD CONSTRAINT `par_suppliers_service_rating_chk` CHECK (`par_suppliers`.`service_rating` IS NULL OR `par_suppliers`.`service_rating` IN ('RUIM','REGULAR','BOM','OTIMO'));