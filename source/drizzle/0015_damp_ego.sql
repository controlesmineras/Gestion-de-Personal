ALTER TABLE `activities` ADD `service_group` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `service_group` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `service_group` text DEFAULT '' NOT NULL;