import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { type Client, createClient } from "@libsql/client";

const MIGRATIONS_DIR = path.resolve("src/migrations");
const MIGRATION_FILES = [
	"0000_fast_stark_industries.sql",
	"0001_ha2ha_events_history.sql",
] as const;

test("workspace migrations create auth, workspace, event, and file-version tables", async () => {
	const client = await createMigratedClient();
	try {
		const tables = await tableNames(client);

		assert.deepEqual(
			[
				"account",
				"session",
				"user",
				"verification",
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

test("workspace deletes cascade to files, events, and file versions", async () => {
	const client = await createMigratedClient();
	try {
		await insertWorkspace(client, "workspace-1");
		await insertWorkspaceFile(client, "workspace-1", "README.md", 1);
		await insertWorkspaceFileVersion(client, "workspace-1", "README.md", 1);
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

		await client.execute({
			args: ["workspace-1"],
			sql: "delete from workspaces where id = ?",
		});

		assert.equal(await countRows(client, "workspace_files"), 0);
		assert.equal(await countRows(client, "workspace_events"), 0);
		assert.equal(await countRows(client, "workspace_file_versions"), 0);
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

async function countRows(client: Client, tableName: string) {
	const result = await client.execute(
		`select count(*) as count from ${tableName}`
	);
	return Number(result.rows[0]?.count ?? 0);
}
