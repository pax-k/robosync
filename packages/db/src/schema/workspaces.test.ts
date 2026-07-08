import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { type Client, createClient } from "@libsql/client";

const MIGRATIONS_DIR = path.resolve("src/migrations");
const MIGRATION_FILES = [
	"0000_fast_stark_industries.sql",
	"0001_ha2ha_events_history.sql",
	"0002_comments.sql",
	"0003_workspace_admin_events.sql",
] as const;

test("workspace migrations create auth, workspace, event, file-version, comment, and admin tables", async () => {
	const client = await createMigratedClient();
	try {
		const tables = await tableNames(client);

		assert.deepEqual(
			[
				"account",
				"comments",
				"session",
				"user",
				"verification",
				"workspace_admin_events",
				"workspace_events",
				"workspace_file_versions",
				"workspace_files",
				"workspaces",
			].every((tableName) => tables.includes(tableName)),
			true
		);
	} finally {
		client.close();
	}
});

test("workspace schema enforces current-file and file-version uniqueness", async () => {
	const client = await createMigratedClient();
	try {
		await insertWorkspace(client, "workspace-1");
		await insertWorkspaceFile(client, "workspace-1", "README.md", 1);
		await insertWorkspaceFileVersion(client, "workspace-1", "README.md", 1);

		await assert.rejects(() =>
			insertWorkspaceFile(client, "workspace-1", "README.md", 1)
		);
		await assert.rejects(() =>
			insertWorkspaceFileVersion(client, "workspace-1", "README.md", 1)
		);
	} finally {
		client.close();
	}
});

test("workspace deletes cascade to files, events, file versions, comments, and admin events", async () => {
	const client = await createMigratedClient();
	try {
		await insertWorkspace(client, "workspace-1");
		await insertWorkspaceFile(client, "workspace-1", "README.md", 1);
		await insertWorkspaceFileVersion(client, "workspace-1", "README.md", 1);
		await insertComment(client, {
			commentId: "comment-1",
			filePath: "README.md",
			version: 1,
			workspaceId: "workspace-1",
		});
		await client.execute({
			args: [
				"event-1",
				"workspace-1",
				"file.created",
				"README.md",
				1,
				"codex-pax",
				"2026-07-08T00:00:00Z",
				"{}",
			],
			sql: `insert into workspace_events (
				id, workspace_id, type, path, version, actor, created_at, payload
			) values (?, ?, ?, ?, ?, ?, ?, ?)`,
		});
		await insertAdminEvent(client, "workspace-1");

		await client.execute({
			args: ["workspace-1"],
			sql: "delete from workspaces where id = ?",
		});

		assert.equal(await countRows(client, "workspace_admin_events"), 0);
		assert.equal(await countRows(client, "workspace_files"), 0);
		assert.equal(await countRows(client, "workspace_events"), 0);
		assert.equal(await countRows(client, "workspace_file_versions"), 0);
		assert.equal(await countRows(client, "comments"), 0);
	} finally {
		client.close();
	}
});

test("comments require existing file-version anchors and do not drift with current file changes", async () => {
	const client = await createMigratedClient();
	try {
		await insertWorkspace(client, "workspace-1");
		await insertWorkspaceFile(client, "workspace-1", "README.md", 1);
		await insertWorkspaceFileVersion(client, "workspace-1", "README.md", 1);
		await insertComment(client, {
			commentId: "comment-1",
			filePath: "README.md",
			version: 1,
			workspaceId: "workspace-1",
		});

		await assert.rejects(() =>
			insertComment(client, {
				commentId: "comment-missing",
				filePath: "README.md",
				version: 99,
				workspaceId: "workspace-1",
			})
		);

		await insertWorkspaceFileVersion(client, "workspace-1", "README.md", 2);
		await client.execute({
			args: [2, "workspace-1", "README.md"],
			sql: "update workspace_files set version = ? where workspace_id = ? and path = ?",
		});

		const comment = await client.execute({
			args: ["comment-1"],
			sql: "select path, version, anchor_json from comments where id = ?",
		});

		assert.deepEqual(
			{
				anchorJson: comment.rows[0]?.anchor_json,
				path: comment.rows[0]?.path,
				version: comment.rows[0]?.version,
			},
			{
				anchorJson: '{"line":1}',
				path: "README.md",
				version: 1,
			}
		);
	} finally {
		client.close();
	}
});

async function createMigratedClient() {
	const client = createClient({ url: "file::memory:" });
	await client.execute("pragma foreign_keys = on");
	const migrationSql = await Promise.all(
		MIGRATION_FILES.map((migrationFile) =>
			readFile(path.join(MIGRATIONS_DIR, migrationFile), "utf8")
		)
	);
	const statements = migrationSql.flatMap(migrationStatements);
	await statements.reduce(
		(previousStatement, statement) =>
			previousStatement.then(() => client.execute(statement)),
		Promise.resolve<unknown>(undefined)
	);
	return client;
}

function migrationStatements(sql: string) {
	return sql
		.split("--> statement-breakpoint")
		.map((statement) => statement.trim())
		.filter(Boolean);
}

async function tableNames(client: Client) {
	const result = await client.execute(
		"select name from sqlite_master where type = 'table' order by name"
	);
	return result.rows.map((row) => String(row.name));
}

async function insertWorkspace(client: Client, workspaceId: string) {
	await client.execute({
		args: [
			"2026-07-08T00:00:00Z",
			workspaceId,
			`workspaces/${workspaceId}`,
			"token",
			"Example",
			"2026-07-08T00:00:00Z",
			"token",
		],
		sql: `insert into workspaces (
			created_at, id, r2_prefix, read_access, title, updated_at, write_access
		) values (?, ?, ?, ?, ?, ?, ?)`,
	});
}

async function insertWorkspaceFile(
	client: Client,
	workspaceId: string,
	filePath: string,
	version: number
) {
	await client.execute({
		args: [
			"text/markdown; charset=utf-8",
			"2026-07-08T00:00:00Z",
			`workspaces/${workspaceId}/objects/${version}`,
			filePath,
			64,
			"2026-07-08T00:00:00Z",
			"codex-pax",
			version,
			workspaceId,
		],
		sql: `insert into workspace_files (
			content_type, created_at, object_key, path, size_bytes, updated_at,
			updated_by, version, workspace_id
		) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	});
}

async function insertWorkspaceFileVersion(
	client: Client,
	workspaceId: string,
	filePath: string,
	version: number
) {
	await client.execute({
		args: [
			workspaceId,
			filePath,
			version,
			`workspaces/${workspaceId}/objects/${version}`,
			"text/markdown; charset=utf-8",
			64,
			"codex-pax",
			"2026-07-08T00:00:00Z",
		],
		sql: `insert into workspace_file_versions (
			workspace_id, path, version, object_key, content_type, size_bytes,
			updated_by, created_at
		) values (?, ?, ?, ?, ?, ?, ?, ?)`,
	});
}

async function insertComment(
	client: Client,
	{
		commentId,
		filePath,
		version,
		workspaceId,
	}: {
		commentId: string;
		filePath: string;
		version: number;
		workspaceId: string;
	}
) {
	await client.execute({
		args: [
			commentId,
			workspaceId,
			filePath,
			version,
			'{"line":1}',
			"Needs review.",
			"codex-pax",
			"2026-07-08T00:00:00Z",
			"2026-07-08T00:00:00Z",
		],
		sql: `insert into comments (
			id, workspace_id, path, version, anchor_json, body, author_id, created_at, updated_at
		) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
	});
}

async function insertAdminEvent(client: Client, workspaceId: string) {
	await client.execute({
		args: [
			"admin-event-1",
			workspaceId,
			"file.version_conflict",
			"README.md",
			"codex-pax",
			'{"baseVersion":1}',
			"2026-07-08T00:00:00Z",
		],
		sql: `insert into workspace_admin_events (
			id, workspace_id, type, path, actor, payload, created_at
		) values (?, ?, ?, ?, ?, ?, ?)`,
	});
}

async function countRows(client: Client, tableName: string) {
	const result = await client.execute(
		`select count(*) as count from ${tableName}`
	);
	return Number(result.rows[0]?.count ?? 0);
}
