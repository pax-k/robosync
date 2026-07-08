CREATE TABLE `comments` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`path` text NOT NULL,
	`version` integer NOT NULL,
	`anchor_json` text DEFAULT '{}' NOT NULL,
	`body` text NOT NULL,
	`author_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`resolved_at` text,
	`resolved_by` text,
	FOREIGN KEY (`workspace_id`,`path`,`version`) REFERENCES `workspace_file_versions`(`workspace_id`,`path`,`version`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `comments_workspace_path_idx` ON `comments` (`workspace_id`,`path`);--> statement-breakpoint
CREATE INDEX `comments_workspace_version_idx` ON `comments` (`workspace_id`,`path`,`version`);--> statement-breakpoint
CREATE INDEX `comments_workspace_resolved_idx` ON `comments` (`workspace_id`,`resolved_at`);
