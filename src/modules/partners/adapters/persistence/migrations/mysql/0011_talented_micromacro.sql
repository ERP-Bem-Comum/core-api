ALTER TABLE `par_collaborators` ADD `sex` varchar(1);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `marital_status` varchar(20);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `has_children` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `children_count` int;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `children_ages` varchar(100);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `is_pwd` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `pwd_description` varchar(255);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `is_on_leave` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `leave_duration` varchar(50);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `leave_renewable` boolean;--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `leave_renewal_duration` varchar(50);--> statement-breakpoint
ALTER TABLE `par_collaborators` ADD `public_sector_experience_duration` varchar(50);