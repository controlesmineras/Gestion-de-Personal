CREATE TABLE `login_attempts` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`reset_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `employee_credentials` (
	`person_id` text PRIMARY KEY NOT NULL,
	`code_hash` text NOT NULL,
	`version` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `discipline` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`kind` text NOT NULL,
	`reason` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`date` text NOT NULL,
	`breakfast` integer DEFAULT 0 NOT NULL,
	`lunch` integer DEFAULT 0 NOT NULL,
	`dinner` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_meal_person_date` ON `meals` (`person_id`,`date`);--> statement-breakpoint
ALTER TABLE `events` ADD `authorized_by` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `events` ADD `extra_days` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `first_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `second_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `first_surname` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `people` ADD `second_surname` text DEFAULT '' NOT NULL;