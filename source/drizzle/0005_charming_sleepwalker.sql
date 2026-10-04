CREATE TABLE `employee_invitations` (
	`person_id` text PRIMARY KEY NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_claim` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`person_id`) REFERENCES `people`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_invitations_token_hash_unique` ON `employee_invitations` (`token_hash`);--> statement-breakpoint
ALTER TABLE `employee_credentials` ADD `salt` text DEFAULT '' NOT NULL;