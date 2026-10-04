CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`operation_id` text NOT NULL,
	`occurred_at` text NOT NULL,
	`actor_id` text NOT NULL,
	`actor_name` text NOT NULL,
	`actor_document` text DEFAULT '' NOT NULL,
	`entity_type` text NOT NULL,
	`target_id` text NOT NULL,
	`person_id` text DEFAULT '' NOT NULL,
	`action` text NOT NULL,
	`changes` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_logs_operation_id_unique` ON `audit_logs` (`operation_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_time` ON `audit_logs` (`occurred_at`);