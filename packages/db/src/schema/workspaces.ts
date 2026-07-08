import { relations } from "drizzle-orm";
import {
	foreignKey,
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
	createdAt: text("created_at").notNull(),
	fileCount: integer("file_count").default(0).notNull(),
	id: text("id").primaryKey(),
	lastAccessedAt: text("last_accessed_at"),
	r2Prefix: text("r2_prefix").notNull(),
	readAccess: text("read_access", { enum: ["public", "token"] }).notNull(),
	readTokenHash: text("read_token_hash"),
	title: text("title"),
	totalSizeBytes: integer("total_size_bytes").default(0).notNull(),
	updatedAt: text("updated_at").notNull(),
	writeAccess: text("write_access", {
		enum: ["none", "public", "token"],
	}).notNull(),
	writeTokenHash: text("write_token_hash"),
});

export const workspaceFiles = sqliteTable(
	"workspace_files",
	{
		contentType: text("content_type").default("text/markdown").notNull(),
		createdAt: text("created_at").notNull(),
		objectKey: text("object_key").notNull(),
		path: text("path").notNull(),
		sha256: text("sha256"),
		sizeBytes: integer("size_bytes").notNull(),
		updatedAt: text("updated_at").notNull(),
		updatedBy: text("updated_by"),
		version: integer("version").default(1).notNull(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.workspaceId, table.path] }),
		index("workspace_files_workspace_path_idx").on(
			table.workspaceId,
			table.path
		),
	]
);

export const workspaceEvents = sqliteTable(
	"workspace_events",
	{
		actor: text("actor"),
		createdAt: text("created_at").notNull(),
		id: text("id").primaryKey(),
		path: text("path"),
		payload: text("payload").default("{}").notNull(),
		type: text("type").notNull(),
		version: integer("version"),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("workspace_events_workspace_created_idx").on(
			table.workspaceId,
			table.createdAt
		),
		index("workspace_events_workspace_path_idx").on(
			table.workspaceId,
			table.path
		),
	]
);

export const workspaceFileVersions = sqliteTable(
	"workspace_file_versions",
	{
		contentType: text("content_type").default("text/markdown").notNull(),
		createdAt: text("created_at").notNull(),
		objectKey: text("object_key").notNull(),
		path: text("path").notNull(),
		sha256: text("sha256"),
		sizeBytes: integer("size_bytes").notNull(),
		updatedBy: text("updated_by"),
		version: integer("version").notNull(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
	},
	(table) => [
		primaryKey({ columns: [table.workspaceId, table.path, table.version] }),
		index("workspace_file_versions_workspace_path_idx").on(
			table.workspaceId,
			table.path
		),
	]
);

export const comments = sqliteTable(
	"comments",
	{
		anchorJson: text("anchor_json").default("{}").notNull(),
		authorId: text("author_id"),
		body: text("body").notNull(),
		createdAt: text("created_at").notNull(),
		id: text("id").primaryKey(),
		path: text("path").notNull(),
		resolvedAt: text("resolved_at"),
		resolvedBy: text("resolved_by"),
		updatedAt: text("updated_at").notNull(),
		version: integer("version").notNull(),
		workspaceId: text("workspace_id").notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.workspaceId, table.path, table.version],
			foreignColumns: [
				workspaceFileVersions.workspaceId,
				workspaceFileVersions.path,
				workspaceFileVersions.version,
			],
		}).onDelete("cascade"),
		index("comments_workspace_path_idx").on(table.workspaceId, table.path),
		index("comments_workspace_version_idx").on(
			table.workspaceId,
			table.path,
			table.version
		),
		index("comments_workspace_resolved_idx").on(
			table.workspaceId,
			table.resolvedAt
		),
	]
);

export const workspaceAdminEvents = sqliteTable(
	"workspace_admin_events",
	{
		actor: text("actor"),
		createdAt: text("created_at").notNull(),
		id: text("id").primaryKey(),
		path: text("path"),
		payload: text("payload").default("{}").notNull(),
		type: text("type").notNull(),
		workspaceId: text("workspace_id")
			.notNull()
			.references(() => workspaces.id, { onDelete: "cascade" }),
	},
	(table) => [
		index("workspace_admin_events_workspace_created_idx").on(
			table.workspaceId,
			table.createdAt
		),
		index("workspace_admin_events_workspace_type_idx").on(
			table.workspaceId,
			table.type
		),
	]
);

export const workspacesRelations = relations(workspaces, ({ many }) => ({
	adminEvents: many(workspaceAdminEvents),
	comments: many(comments),
	events: many(workspaceEvents),
	files: many(workspaceFiles),
	fileVersions: many(workspaceFileVersions),
}));

export const workspaceFilesRelations = relations(workspaceFiles, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [workspaceFiles.workspaceId],
		references: [workspaces.id],
	}),
}));

export const workspaceEventsRelations = relations(
	workspaceEvents,
	({ one }) => ({
		workspace: one(workspaces, {
			fields: [workspaceEvents.workspaceId],
			references: [workspaces.id],
		}),
	})
);

export const workspaceFileVersionsRelations = relations(
	workspaceFileVersions,
	({ many, one }) => ({
		comments: many(comments),
		workspace: one(workspaces, {
			fields: [workspaceFileVersions.workspaceId],
			references: [workspaces.id],
		}),
	})
);

export const commentsRelations = relations(comments, ({ one }) => ({
	fileVersion: one(workspaceFileVersions, {
		fields: [comments.workspaceId, comments.path, comments.version],
		references: [
			workspaceFileVersions.workspaceId,
			workspaceFileVersions.path,
			workspaceFileVersions.version,
		],
	}),
}));

export const workspaceAdminEventsRelations = relations(
	workspaceAdminEvents,
	({ one }) => ({
		workspace: one(workspaces, {
			fields: [workspaceAdminEvents.workspaceId],
			references: [workspaces.id],
		}),
	})
);
