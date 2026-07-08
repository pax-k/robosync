CREATE TABLE `workspace_events` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`type` text NOT NULL,
	`path` text,
	`version` integer,
	`actor` text,
	`created_at` text NOT NULL,
	`payload` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_events_workspace_created_idx` ON `workspace_events` (`workspace_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `workspace_events_workspace_path_idx` ON `workspace_events` (`workspace_id`,`path`);--> statement-breakpoint
CREATE TABLE `workspace_file_versions` (
	`workspace_id` text NOT NULL,
	`path` text NOT NULL,
	`version` integer NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text DEFAULT 'text/markdown' NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text,
	`updated_by` text,
	`created_at` text NOT NULL,
	PRIMARY KEY(`workspace_id`, `path`, `version`),
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `workspace_file_versions_workspace_path_idx` ON `workspace_file_versions` (`workspace_id`,`path`);
