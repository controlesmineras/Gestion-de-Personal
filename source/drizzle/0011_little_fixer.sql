CREATE TABLE `activities` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`coordinator_id` text NOT NULL,
	`revision` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`coordinator_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `activity_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`activity_id` text NOT NULL,
	`person_id` text NOT NULL,
	`function` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`activity_id`) REFERENCES `activities`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_activity_person` ON `activity_participants` (`activity_id`,`person_id`);--> statement-breakpoint
CREATE INDEX `idx_activity_participant` ON `activity_participants` (`person_id`);--> statement-breakpoint
ALTER TABLE `events` ADD `activity_id` text DEFAULT '' NOT NULL;