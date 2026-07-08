import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
	type Client,
	createClient,
	type InValue,
	type ResultSet,
} from "@libsql/client";
import { HA2HA_EVENT_TYPES, HA2HA_HEADERS } from "@mdsync/ha2ha-protocol";

import {
	setWorkspaceBindingsForTest,
	type WorkspaceBindings,
} from "./bindings";
import { workspaceRoutes } from "./routes";

const MIGRATIONS_DIR = path.resolve("../../packages/db/src/migrations");
const MIGRATION_FILES = [
	"0000_fast_stark_industries.sql",
	"0001_ha2ha_events_history.sql",
] as const;

interface CreateWorkspacePayload {
	editUrl?: string;
	id: string;
	rawUrl: string;
	workspaceUrl: string;
}

interface FilePayload {
	content: string;
	contentType: string;
	path: string;
	updatedBy: string | null;
	version: number;
	workspaceId: string;
}

interface ConflictPayload {
	error: string;
	latest: FilePayload | null;
	message: string;
}

interface EventsPayload {
	events: Array<{
		actor: string | null;
		path: string | null;
		type: string;
		version: number | null;
		workspaceId: string;
	}>;
	workspaceId: string;
}

interface FileVersionsPayload {
	path: string;
	versions: Array<{
		path: string;
		updatedBy: string | null;
		version: number;
		workspaceId: string;
	}>;
	workspaceId: string;
}

test("workspaceRoutes cover create, read, update, conflict, history, events, and delete", async (t) => {
	const { bindings, client } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const createResponse = await workspaceRoutes.request(
		"http://api.test/api/workspaces",
		{
			body: JSON.stringify({
				actor: "creator",
				files: [
					{ content: "# Backend smoke\n", path: "README.md" },
					{ content: "- [ ] Build backend\n", path: "TODO.md" },
				],
				readAccess: "token",
				title: "Route integration",
				writeAccess: "token",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(createResponse.status, 201);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	assert.ok(created.editUrl);
	assert.equal(created.workspaceUrl.startsWith("http://web.test/"), true);
	const editToken = new URL(created.editUrl).searchParams.get("edit");
	assert.ok(editToken);

	const listingResponse = await workspaceRoutes.request(created.rawUrl);
	assert.equal(listingResponse.status, 200);
	const listing = await listingResponse.text();
	assert.equal(listing.includes(`# ha2ha workspace: ${created.id}`), true);
	assert.equal(listing.includes("README.md"), true);
	assert.equal(listing.includes("TODO.md"), true);

	const rawFileResponse = await workspaceRoutes.request(
		`http://api.test/w/${created.id}/raw/README.md?edit=${editToken}`
	);
	assert.equal(rawFileResponse.status, 200);
	assert.equal(rawFileResponse.headers.get(HA2HA_HEADERS.fileVersion), "1");
	assert.equal(rawFileResponse.headers.get(HA2HA_HEADERS.path), "README.md");
	assert.equal(await rawFileResponse.text(), "# Backend smoke\n");

	const fileResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files?path=TODO.md&edit=${editToken}`
	);
	assert.equal(fileResponse.status, 200);
	const file = await readJson<FilePayload>(fileResponse);
	assert.equal(file.version, 1);
	assert.equal(file.content, "- [ ] Build backend\n");

	const updateResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "route-test",
				baseVersion: file.version,
				content: "- [x] Build backend\n",
				path: "TODO.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(updateResponse.status, 200);
	const updated = await readJson<FilePayload>(updateResponse);
	assert.equal(updated.version, 2);
	assert.equal(updated.updatedBy, "route-test");

	const conflictResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "route-test",
				baseVersion: file.version,
				content: "- [ ] stale write\n",
				path: "TODO.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(conflictResponse.status, 409);
	const conflict = await readJson<ConflictPayload>(conflictResponse);
	assert.equal(conflict.error, "version_conflict");
	assert.equal(conflict.latest?.version, 2);
	assert.equal(conflict.latest?.content, "- [x] Build backend\n");

	const historyResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files/versions?path=TODO.md&edit=${editToken}`
	);
	assert.equal(historyResponse.status, 200);
	const history = await readJson<FileVersionsPayload>(historyResponse);
	assert.deepEqual(
		history.versions.map((version) => version.version),
		[1, 2]
	);

	const historicalFileResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files/versions/1?path=TODO.md&edit=${editToken}`
	);
	assert.equal(historicalFileResponse.status, 200);
	const historicalFile = await readJson<FilePayload>(historicalFileResponse);
	assert.equal(historicalFile.content, "- [ ] Build backend\n");

	const deleteResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files?path=TODO.md`,
		{
			body: JSON.stringify({
				actor: "route-test",
				baseVersion: 2,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "DELETE",
		}
	);
	assert.equal(deleteResponse.status, 200);
	assert.equal(
		(await readJson<{ deleted: boolean }>(deleteResponse)).deleted,
		true
	);

	const eventsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/events?edit=${editToken}`
	);
	assert.equal(eventsResponse.status, 200);
	const events = await readJson<EventsPayload>(eventsResponse);
	assert.deepEqual(
		events.events.map((event) => event.type),
		[
			HA2HA_EVENT_TYPES.fileCreated,
			HA2HA_EVENT_TYPES.fileCreated,
			HA2HA_EVENT_TYPES.fileUpdated,
			HA2HA_EVENT_TYPES.fileDeleted,
		]
	);
	assert.equal(
		events.events.some(
			(event) =>
				event.type === HA2HA_EVENT_TYPES.fileUpdated &&
				event.actor === "route-test" &&
				event.path === "TODO.md" &&
				event.version === 2
		),
		true
	);
});

test("workspaceRoutes reject invalid create paths before writing files", async (t) => {
	const { bindings, client, files } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const response = await workspaceRoutes.request(
		"http://api.test/api/workspaces",
		{
			body: JSON.stringify({
				files: [{ content: "bad", path: "../bad.md" }],
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);

	assert.equal(response.status, 400);
	assert.equal(
		(await readJson<{ error: string }>(response)).error,
		"invalid_path"
	);
	assert.equal(files.size, 0);
});

async function createTestBindings() {
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

	const files = new TestR2Bucket();
	const bindings = {
		DB: new TestD1Database(client) as unknown as D1Database,
		FILES: files as unknown as R2Bucket,
		WEB_ORIGIN: "http://web.test",
	} satisfies WorkspaceBindings;

	return { bindings, client, files };
}

function migrationStatements(sql: string) {
	return sql
		.split("--> statement-breakpoint")
		.map((statement) => statement.trim())
		.filter(Boolean);
}

async function readJson<T>(response: Response): Promise<T> {
	return (await response.json()) as T;
}

class TestD1Database {
	private readonly client: Client;

	constructor(client: Client) {
		this.client = client;
	}

	prepare(sql: string) {
		return new TestD1Statement(this.client, sql);
	}

	async batch(statements: TestD1Statement[]) {
		const results: Array<{ meta: { changes: number } }> = [];
		await statements.reduce<Promise<unknown>>(
			(previousResults, statement) =>
				previousResults.then(async () => {
					results.push(await statement.run());
				}),
			Promise.resolve(undefined)
		);
		return results;
	}
}

class TestD1Statement {
	private readonly args: InValue[];
	private readonly client: Client;
	private readonly sql: string;

	constructor(client: Client, sql: string, args: InValue[] = []) {
		this.args = args;
		this.client = client;
		this.sql = sql;
	}

	bind(...args: InValue[]) {
		return new TestD1Statement(this.client, this.sql, args);
	}

	async first<T>() {
		const result = await this.execute();
		return (result.rows[0] as T | undefined) ?? null;
	}

	async all<T>() {
		const result = await this.execute();
		return { results: result.rows as T[] };
	}

	async run() {
		const result = await this.execute();
		return { meta: { changes: result.rowsAffected } };
	}

	private execute(): Promise<ResultSet> {
		return this.client.execute({ args: this.args, sql: this.sql });
	}
}

class TestR2Bucket {
	private readonly objects = new Map<string, { content: string }>();

	get size() {
		return this.objects.size;
	}

	put(key: string, value: string) {
		this.objects.set(key, { content: value });
	}

	get(key: string) {
		const object = this.objects.get(key);
		if (!object) {
			return null;
		}
		const response = new Response(object.content);
		return {
			body: response.body,
			text: () => Promise.resolve(object.content),
		} as R2ObjectBody;
	}

	delete(key: string) {
		this.objects.delete(key);
	}
}
