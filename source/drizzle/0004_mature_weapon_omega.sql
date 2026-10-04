CREATE TABLE `admin_credentials` (
	`username` text PRIMARY KEY NOT NULL,
	`password_hash` text NOT NULL,
	`salt` text NOT NULL,
	`version` text NOT NULL,
	`created_at` text NOT NULL
);
