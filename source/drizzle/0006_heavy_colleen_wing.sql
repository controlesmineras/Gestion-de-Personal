ALTER TABLE `employee_credentials` ADD `access_role` text DEFAULT 'Laboral' NOT NULL;--> statement-breakpoint
ALTER TABLE `employee_invitations` ADD `access_role` text DEFAULT 'Laboral' NOT NULL;