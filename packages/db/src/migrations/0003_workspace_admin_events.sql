CREATE TABLE `workspace_admin_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`type` text NOT NULL,
	`path` text,
	`actor` text,
	`payload` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_admin_events_workspace_created_idx` ON `workspace_admin_events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_admin_events_workspace_type_idx` ON `workspace_admin_events` (`workspace_id`,`type`);
