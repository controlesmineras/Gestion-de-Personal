CREATE TABLE `training_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`validity_months` integer DEFAULT 12 NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `training_requirements_name_unique` ON `training_requirements` (`name`);--> statement-breakpoint
ALTER TABLE `people` ADD `qualifications_json` text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `contract_end` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `contract_indefinite` integer DEFAULT 0 NOT NULL;