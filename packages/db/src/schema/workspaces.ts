import { relations } from "drizzle-orm";
import {
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

export const workspacesRelations = relations(workspaces, ({ many }) => ({
	files: many(workspaceFiles),
}));

export const workspaceFilesRelations = relations(workspaceFiles, ({ one }) => ({
	workspace: one(workspaces, {
		fields: [workspaceFiles.workspaceId],
		references: [workspaces.id],
	}),
}));
