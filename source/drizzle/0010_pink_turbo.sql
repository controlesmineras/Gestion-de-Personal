CREATE TABLE `meal_attendance` (
	`id` text PRIMARY KEY NOT NULL,
	`person_id` text NOT NULL,
	`date` text NOT NULL,
	`meal` text NOT NULL,
	`received` integer DEFAULT 0 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_by_name` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_attendance_person_date_meal` ON `meal_attendance` (`person_id`,`date`,`meal`);