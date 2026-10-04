CREATE TABLE `work_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`min_rest_hours` real DEFAULT 8 NOT NULL,
	`max_work_hours_24` real DEFAULT 12 NOT NULL,
	`updated_at` text NOT NULL
);
