import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import {
	HA2HA_EVENT_TYPES,
	HA2HA_HEADERS,
	ha2haParticipantFrontmatterSchema,
	ha2haWorkspaceManifestSchema,
} from "@ha2ha/protocol";
import {
	type Client,
	createClient,
	type InValue,
	type ResultSet,
} from "@libsql/client";
import { workspaceOverviewResponseSchema } from "@mdsync/contracts/workspaces";

import {
	setWorkspaceBindingsForTest,
	type WorkspaceBindings,
} from "./bindings";
import { workspaceRoutes } from "./routes";

const MIGRATIONS_DIR = path.resolve("../../packages/db/src/migrations");
const MIGRATION_FILES = [
	"0000_fast_stark_industries.sql",
	"0001_ha2ha_events_history.sql",
	"0002_comments.sql",
	"0003_workspace_admin_events.sql",
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

interface ActivityPayload {
	items: Array<{
		actor: string | null;
		createdAt: string;
		id: string;
		path: string | null;
		source: "comment" | "event";
		type: string;
		version: number | null;
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

interface CommentPayload {
	anchor: Record<string, unknown>;
	authorId: string | null;
	body: string;
	id: string;
	path: string;
	resolvedAt: string | null;
	resolvedBy: string | null;
	version: number;
	workspaceId: string;
}

interface CommentsPayload {
	comments: CommentPayload[];
	workspaceId: string;
}

interface CapabilitiesPayload {
	capabilities: {
		edit: {
			access: string;
			canRevoke: boolean;
			canRotate: boolean;
			tokenActive: boolean;
		};
		read: {
			access: string;
			canRevoke: boolean;
			canRotate: boolean;
			tokenActive: boolean;
		};
	};
	workspaceId: string;
}

interface CapabilityRotationPayload extends CapabilitiesPayload {
	capability: "edit" | "read";
	links: {
		editUrl?: string;
		rawUrl?: string;
		workspaceUrl?: string;
	};
}

interface CapabilityRevocationPayload extends CapabilitiesPayload {
	capability: "edit" | "read";
	revoked: boolean;
}

interface WorkspaceAdminStatsPayload {
	cleanup: {
		failedJobs: number;
		orphanedObjects: {
			count: number | null;
			status: string;
		};
	};
	comments: {
		staleAnchors: number;
		total: number;
		unresolved: number;
	};
	conflicts: {
		recent: Array<{
			actor: string | null;
			path: string | null;
			payload: Record<string, unknown>;
			type: string;
		}>;
		total: number;
	};
	events: {
		byType: Array<{ count: number; name: string }>;
		total: number;
	};
	files: {
		currentCount: number;
		totalSizeBytes: number;
	};
	health: {
		issues: string[];
		status: string;
	};
	retention: {
		coverage: string[];
		status: string;
	};
	storage: {
		activeBytes: number;
		currentFileRecords: number;
		indexedObjects: number;
		r2Prefix: string;
		versionBytes: number;
		versionRecords: number;
	};
	tasks: {
		byState: Array<{ count: number; name: string }>;
		files: Array<{ path: string; state: string | null; version: number }>;
		missingState: number;
		total: number;
	};
	versions: {
		pathsWithHistory: number;
		totalCount: number;
	};
	workspace: {
		fileCount: number;
		id: string;
		readAccess: string;
		totalSizeBytes: number;
		writeAccess: string;
	};
	workspaceId: string;
}

interface WorkspaceExportPayload {
	adminEvents: Array<{
		actor: string | null;
		path: string | null;
		payload: Record<string, unknown>;
		type: string;
	}>;
	comments: Array<{
		anchor: Record<string, unknown>;
		authorId: string | null;
		body: string;
		path: string;
		resolvedAt: string | null;
		version: number;
	}>;
	events: Array<{
		actor: string | null;
		path: string | null;
		payload: Record<string, unknown>;
		type: string;
		version: number | null;
	}>;
	files: Array<{
		content: string;
		contentType: string;
		path: string;
		updatedBy: string | null;
		version: number;
	}>;
	fileVersions: Array<{
		content: string;
		contentType: string;
		path: string;
		updatedBy: string | null;
		version: number;
	}>;
	format: string;
	retention: {
		coverage: string[];
		perWorkspaceD1: {
			status: string;
		};
		status: string;
	};
	schemaVersion: number;
	workspace: {
		id: string;
		title: string | null;
	};
}

interface ImportWorkspacePayload extends CreateWorkspacePayload {
	importedCounts: {
		adminEvents: number;
		comments: number;
		events: number;
		fileVersions: number;
		files: number;
	};
	sourceWorkspaceId: string;
}

interface RetentionPolicyPayload {
	retention: {
		coverage: string[];
		perWorkspaceD1: {
			status: string;
		};
		status: string;
	};
	workspaceId: string;
}

interface RetentionPrunePayload {
	pruned: {
		adminEvents: number;
		events: number;
		fileVersionObjects: number;
		fileVersions: number;
		orphanedObjects: number;
		resolvedComments: number;
	};
	skipped: {
		orphanedObjects: number;
	};
	workspaceId: string;
}

test("workspaceRoutes expose read-safe MDSync deployment discovery", async (t) => {
	const { bindings, client } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const response = await workspaceRoutes.request(
		"http://api.test/.well-known/mdsync.json?edit=secret"
	);
	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), {
		apiOrigin: "http://api.test",
		discoveryVersion: 1,
		product: "mdsync",
		webOrigin: "http://web.test",
	});
});

test("workspaceRoutes atomically create a conformant HA2HA workspace", async (t) => {
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
				actor: "agent-a",
				files: [
					{
						content: [
							"---",
							"id: HANDOFF-001",
							"title: Coordinate the handoff",
							"state: ready",
							"owner: null",
							"updated_by: agent-a",
							"---",
							"",
							"# Coordinate the handoff",
						].join("\n"),
						path: "tasks/HANDOFF-001.md",
					},
				],
				protocol: { kind: "ha2ha", version: "1.0.0" },
				title: "URL handoff",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(createResponse.status, 201);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	const editToken = new URL(created.editUrl ?? "").searchParams.get("edit");
	const readToken = new URL(created.workspaceUrl).searchParams.get("k");
	assert.ok(editToken);
	assert.ok(readToken);

	const manifestResponse = await workspaceRoutes.request(
		`http://api.test/w/${created.id}/raw/.ha2ha/workspace.json?edit=${editToken}`
	);
	assert.equal(manifestResponse.status, 200);
	const manifest = ha2haWorkspaceManifestSchema.parse(
		JSON.parse(await manifestResponse.text())
	);
	assert.equal(manifest.workspaceId, created.id);
	assert.equal(manifest.conflictPolicy, "baseVersion-required");
	assert.equal(manifest.routes.tree, `/api/workspaces/${created.id}/tree`);

	const participantResponse = await workspaceRoutes.request(
		`http://api.test/w/${created.id}/raw/participants/agent-a.md?edit=${editToken}`
	);
	assert.equal(participantResponse.status, 200);
	const participantContent = await participantResponse.text();
	assert.equal(participantContent.includes("id: agent-a"), true);
	assert.equal(
		ha2haParticipantFrontmatterSchema.safeParse({
			can_edit: true,
			id: "agent-a",
		}).success,
		true
	);

	const treeResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/tree?edit=${editToken}`
	);
	const tree = await readJson<{ files: Array<{ path: string }> }>(treeResponse);
	assert.deepEqual(tree.files.map((file) => file.path).sort(), [
		".ha2ha/workspace.json",
		"HA2HA.md",
		"STATUS.md",
		"participants/agent-a.md",
		"tasks/HANDOFF-001.md",
	]);
});

test("workspaceRoutes reject invalid HA2HA creation before persistence", async (t) => {
	const { bindings, client, files } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const responses = await Promise.all(
		[
			{
				actor: "agent-a",
				files: [{ content: "# invalid", path: "tasks/BAD-001.md" }],
				protocol: { kind: "ha2ha", version: "1.0.0" },
			},
			{
				actor: "agent-a",
				files: [
					{
						content: "{}",
						path: ".ha2ha/workspace.json",
					},
					{
						content: "---\nid: TASK-001\ntitle: Task\nstate: ready\n---\n",
						path: "tasks/TASK-001.md",
					},
				],
				protocol: { kind: "ha2ha", version: "1.0.0" },
			},
		].map((input) =>
			workspaceRoutes.request("http://api.test/api/workspaces", {
				body: JSON.stringify(input),
				headers: { "Content-Type": "application/json" },
				method: "POST",
			})
		)
	);
	for (const response of responses) {
		assert.equal(response.status, 400);
	}
	assert.equal(files.size, 0);
	const workspaceCount = await client.execute(
		"select count(*) as count from workspaces"
	);
	assert.equal(Number(workspaceCount.rows[0]?.count), 0);
});

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

test("workspace overview is read-authorized, resilient to invalid tasks, and excludes admin data", async (t) => {
	const { bindings, client } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const taskFile = (state: string, priority: string) => ({
		content: [
			"---",
			`id: ${state.toUpperCase()}-001`,
			`title: ${state} task`,
			`state: ${state}`,
			"owner: null",
			`priority: ${priority}`,
			"---",
			"",
			`# ${state} task`,
		].join("\n"),
		path: `tasks/${state}.md`,
	});
	const createResponse = await workspaceRoutes.request(
		"http://api.test/api/workspaces",
		{
			body: JSON.stringify({
				actor: "creator",
				files: [
					{ content: "# Overview\n", path: "README.md" },
					taskFile("ready", "low"),
					taskFile("claimed", "medium"),
					taskFile("working", "high"),
					taskFile("blocked", "urgent"),
					taskFile("review", "high"),
					taskFile("done", "low"),
					taskFile("abandoned", "low"),
					{
						content: "---\nid: BROKEN\nstate: nope\n",
						path: "tasks/invalid.md",
					},
				],
				readAccess: "token",
				title: "Overview projection",
				writeAccess: "token",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	const editToken = new URL(created.editUrl ?? "").searchParams.get("edit");
	const readToken = new URL(created.workspaceUrl).searchParams.get("k");
	assert.ok(editToken);
	assert.ok(readToken);

	const unauthorized = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/overview`
	);
	assert.equal(unauthorized.status, 401);

	const commentResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments`,
		{
			body: JSON.stringify({
				actor: "reviewer",
				body: "Review the opening.",
				path: "README.md",
				version: 1,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(commentResponse.status, 201);
	const updateResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "writer",
				baseVersion: 1,
				content: "# Overview\n\nUpdated.\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(updateResponse.status, 200);

	const response = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/overview?k=${readToken}`
	);
	assert.equal(response.status, 200);
	const payload: unknown = await response.json();
	const overview = workspaceOverviewResponseSchema.parse(payload);
	assert.equal(overview.tasks.invalidCount, 1);
	assert.equal(overview.comments.staleAnchors, 1);
	assert.equal(overview.activity.recent.length, 8);
	assert.deepEqual(
		overview.tasks.items.map((item) => (item.valid ? item.state : "invalid")),
		[
			"invalid",
			"blocked",
			"review",
			"working",
			"claimed",
			"ready",
			"done",
			"abandoned",
		]
	);
	assert.deepEqual(
		overview.tasks.byState.map((item) => item.name),
		["ready", "claimed", "working", "blocked", "review", "done", "abandoned"]
	);
	const serialized = JSON.stringify(overview);
	for (const forbidden of [
		"r2Prefix",
		"retention",
		"conflicts",
		"cleanup",
		"capabilities",
	]) {
		assert.equal(serialized.includes(forbidden), false);
	}
});

test("workspaceRoutes rotate and revoke read and edit capabilities without plaintext token storage", async (t) => {
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
				files: [{ content: "# Capability target\n", path: "README.md" }],
				readAccess: "token",
				title: "Capability route integration",
				writeAccess: "token",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(createResponse.status, 201);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	const oldEditToken = new URL(created.editUrl ?? "").searchParams.get("edit");
	const oldReadToken = new URL(created.rawUrl).searchParams.get("k");
	assert.ok(oldEditToken);
	assert.ok(oldReadToken);

	const readOnlyCapabilitiesResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities?k=${oldReadToken}`
	);
	assert.equal(readOnlyCapabilitiesResponse.status, 401);

	const capabilitiesResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities?edit=${oldEditToken}`
	);
	assert.equal(capabilitiesResponse.status, 200);
	const capabilities =
		await readJson<CapabilitiesPayload>(capabilitiesResponse);
	assert.equal(capabilities.capabilities.read.tokenActive, true);
	assert.equal(capabilities.capabilities.edit.tokenActive, true);
	assert.equal(JSON.stringify(capabilities).includes(oldReadToken), false);
	assert.equal(JSON.stringify(capabilities).includes(oldEditToken), false);

	const rotateReadResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities/read/rotate?edit=${oldEditToken}`,
		{ method: "POST" }
	);
	assert.equal(rotateReadResponse.status, 200);
	const rotatedRead =
		await readJson<CapabilityRotationPayload>(rotateReadResponse);
	assert.equal(rotatedRead.capability, "read");
	assert.ok(rotatedRead.links.rawUrl);
	assert.ok(rotatedRead.links.workspaceUrl);
	const newReadToken = new URL(rotatedRead.links.rawUrl).searchParams.get("k");
	assert.ok(newReadToken);
	assert.notEqual(newReadToken, oldReadToken);

	const oldReadResponse = await workspaceRoutes.request(created.rawUrl);
	assert.equal(oldReadResponse.status, 403);
	const newReadResponse = await workspaceRoutes.request(
		rotatedRead.links.rawUrl
	);
	assert.equal(newReadResponse.status, 200);

	const rotateEditResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities/edit/rotate?edit=${oldEditToken}`,
		{ method: "POST" }
	);
	assert.equal(rotateEditResponse.status, 200);
	const rotatedEdit =
		await readJson<CapabilityRotationPayload>(rotateEditResponse);
	assert.equal(rotatedEdit.capability, "edit");
	assert.ok(rotatedEdit.links.editUrl);
	const newEditToken = new URL(rotatedEdit.links.editUrl).searchParams.get(
		"edit"
	);
	assert.ok(newEditToken);
	assert.notEqual(newEditToken, oldEditToken);

	const persistedTokens = await client.execute({
		args: [created.id],
		sql: "select read_token_hash, write_token_hash from workspaces where id = ?",
	});
	assert.notEqual(persistedTokens.rows[0]?.read_token_hash, newReadToken);
	assert.notEqual(persistedTokens.rows[0]?.write_token_hash, newEditToken);

	const oldEditCapabilitiesResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities?edit=${oldEditToken}`
	);
	assert.equal(oldEditCapabilitiesResponse.status, 403);
	const newEditCapabilitiesResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities?edit=${newEditToken}`
	);
	assert.equal(newEditCapabilitiesResponse.status, 200);

	const revokeReadResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities/read/revoke?edit=${newEditToken}`,
		{ method: "POST" }
	);
	assert.equal(revokeReadResponse.status, 200);
	const revokedRead =
		await readJson<CapabilityRevocationPayload>(revokeReadResponse);
	assert.equal(revokedRead.revoked, true);
	assert.equal(revokedRead.capabilities.read.tokenActive, false);
	assert.equal(
		(await workspaceRoutes.request(rotatedRead.links.rawUrl)).status,
		403
	);

	const revokeEditResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/capabilities/edit/revoke?edit=${newEditToken}`,
		{ method: "POST" }
	);
	assert.equal(revokeEditResponse.status, 200);
	const revokedEdit =
		await readJson<CapabilityRevocationPayload>(revokeEditResponse);
	assert.equal(revokedEdit.revoked, true);
	assert.equal(revokedEdit.capabilities.edit.access, "none");
	assert.equal(revokedEdit.capabilities.edit.tokenActive, false);

	const revokedEditWriteResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "agent-context-a",
				baseVersion: 1,
				content: "# revoked\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${newEditToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(revokedEditWriteResponse.status, 403);
	assert.equal(
		(await readJson<{ error: string }>(revokedEditWriteResponse)).error,
		"write_disabled"
	);
});

test("workspaceRoutes aggregate product admin stats without changing protocol events", async (t) => {
	const { bindings, client } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const taskContent = [
		"---",
		"id: RS-001",
		"title: Example task",
		"state: ready",
		"---",
		"",
		"## Work",
		"",
		"Ship the admin view.",
		"",
	].join("\n");
	const createResponse = await workspaceRoutes.request(
		"http://api.test/api/workspaces",
		{
			body: JSON.stringify({
				actor: "creator",
				files: [
					{ content: "# Admin target\n", path: "README.md" },
					{ content: taskContent, path: "tasks/RS-001.md" },
				],
				readAccess: "token",
				title: "Admin route integration",
				writeAccess: "token",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(createResponse.status, 201);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	const editToken = new URL(created.editUrl ?? "").searchParams.get("edit");
	const readToken = new URL(created.workspaceUrl).searchParams.get("k");
	assert.ok(editToken);
	assert.ok(readToken);

	const readOnlyAdminResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/admin/stats?k=${readToken}`
	);
	assert.equal(readOnlyAdminResponse.status, 401);
	assert.equal(
		(await readJson<{ error: string }>(readOnlyAdminResponse)).error,
		"missing_token"
	);

	const updateResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "agent-context-a",
				baseVersion: 1,
				content: "# Admin target\n\nUpdated by agent.\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(updateResponse.status, 200);

	const commentResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments`,
		{
			body: JSON.stringify({
				actor: "reviewer",
				body: "This comment should remain on the original version.",
				path: "README.md",
				selector: { line: 1 },
				version: 1,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(commentResponse.status, 201);

	const conflictResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "agent-context-b",
				baseVersion: 1,
				content: "# stale\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(conflictResponse.status, 409);

	const statsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/admin/stats?edit=${editToken}`
	);
	assert.equal(statsResponse.status, 200);
	const stats = await readJson<WorkspaceAdminStatsPayload>(statsResponse);
	assert.equal(stats.workspaceId, created.id);
	assert.equal(stats.workspace.id, created.id);
	assert.equal(stats.workspace.readAccess, "token");
	assert.equal(stats.workspace.writeAccess, "token");
	assert.equal(stats.files.currentCount, 2);
	assert.equal(stats.files.totalSizeBytes, stats.storage.activeBytes);
	assert.equal(stats.storage.currentFileRecords, 2);
	assert.equal(stats.storage.versionRecords, 3);
	assert.equal(stats.storage.indexedObjects, 3);
	assert.equal(stats.versions.totalCount, 3);
	assert.equal(stats.versions.pathsWithHistory, 1);
	assert.equal(
		countNamed(stats.events.byType, HA2HA_EVENT_TYPES.fileCreated),
		2
	);
	assert.equal(
		countNamed(stats.events.byType, HA2HA_EVENT_TYPES.fileUpdated),
		1
	);
	assert.equal(stats.events.total, 3);
	assert.equal(stats.comments.total, 1);
	assert.equal(stats.comments.unresolved, 1);
	assert.equal(stats.comments.staleAnchors, 1);
	assert.equal(stats.conflicts.total, 1);
	assert.deepEqual(
		stats.conflicts.recent.map((event) => ({
			actor: event.actor,
			latestVersion: event.payload.latestVersion,
			path: event.path,
			type: event.type,
		})),
		[
			{
				actor: "agent-context-b",
				latestVersion: 2,
				path: "README.md",
				type: "file.version_conflict",
			},
		]
	);
	assert.deepEqual(stats.tasks.byState, [{ count: 1, name: "ready" }]);
	assert.deepEqual(stats.tasks.files, [
		{ path: "tasks/RS-001.md", state: "ready", version: 1 },
	]);
	assert.equal(stats.tasks.missingState, 0);
	assert.equal(stats.tasks.total, 1);
	assert.equal(stats.cleanup.failedJobs, 0);
	assert.deepEqual(stats.cleanup.orphanedObjects, {
		count: null,
		status: "not_scanned",
	});
	assert.equal(stats.retention.status, "not_configured");
	assert.equal(stats.retention.coverage.includes("admin events"), true);
	assert.equal(stats.health.status, "attention");
	assert.equal(
		stats.health.issues.includes(
			"Version conflicts were observed for this workspace."
		),
		true
	);

	const eventsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/events?edit=${editToken}`
	);
	assert.equal(eventsResponse.status, 200);
	const events = await readJson<EventsPayload>(eventsResponse);
	assert.equal(events.events.length, 3);
	assert.equal(
		events.events.filter(
			(event) => event.type === HA2HA_EVENT_TYPES.fileCreated
		).length,
		2
	);
	assert.equal(
		events.events.filter(
			(event) => event.type === HA2HA_EVENT_TYPES.fileUpdated
		).length,
		1
	);
	assert.equal(
		events.events.some((event) => event.type === "file.version_conflict"),
		false
	);
});

test("workspaceRoutes export import and prune retained product data without per-workspace D1", async (t) => {
	const { bindings, client, files } = await createTestBindings();
	setWorkspaceBindingsForTest(bindings);
	t.after(() => {
		setWorkspaceBindingsForTest(null);
		client.close();
	});

	const manifestContent = JSON.stringify(
		{
			id: "fixture-workspace",
			schema: "ha2ha.workspace.v1",
		},
		null,
		2
	);
	const taskV1 = [
		"---",
		"id: RS-007",
		"title: Export fixture",
		"state: ready",
		"---",
		"",
		"## Work",
		"",
		"Preserve this task.",
		"",
	].join("\n");
	const taskV2 = taskV1.replace("state: ready", "state: in_progress");
	const createResponse = await workspaceRoutes.request(
		"http://api.test/api/workspaces",
		{
			body: JSON.stringify({
				actor: "human-reviewer",
				files: [
					{ content: manifestContent, path: ".ha2ha/workspace.json" },
					{ content: "# Export fixture\n", path: "README.md" },
					{ content: taskV1, path: "tasks/RS-007.md" },
					{
						content: "Evidence captured before export.\n",
						path: "evidence/RS-007/proof.md",
					},
				],
				readAccess: "token",
				title: "V2 export fixture",
				writeAccess: "token",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(createResponse.status, 201);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	const editToken = new URL(created.editUrl ?? "").searchParams.get("edit");
	const readToken = new URL(created.workspaceUrl).searchParams.get("k");
	assert.ok(editToken);
	assert.ok(readToken);

	const readOnlyExportResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/export?k=${readToken}`
	);
	assert.equal(readOnlyExportResponse.status, 401);

	const readmeUpdateResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "agent-context-a",
				baseVersion: 1,
				content: "# Export fixture\n\nUpdated for import.\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(readmeUpdateResponse.status, 200);

	const taskUpdateResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "agent-context-b",
				baseVersion: 1,
				content: taskV2,
				path: "tasks/RS-007.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(taskUpdateResponse.status, 200);

	const unresolvedCommentResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments`,
		{
			body: JSON.stringify({
				actor: "reviewer",
				body: "README history should survive export.",
				path: "README.md",
				selector: { line: 1 },
				version: 1,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(unresolvedCommentResponse.status, 201);

	const resolvedCommentResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments`,
		{
			body: JSON.stringify({
				actor: "reviewer",
				body: "Manifest question is resolved before retention.",
				path: ".ha2ha/workspace.json",
				selector: { line: 1 },
				version: 1,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(resolvedCommentResponse.status, 201);
	const resolvedComment = await readJson<CommentPayload>(
		resolvedCommentResponse
	);
	const resolveResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments/${resolvedComment.id}/resolve`,
		{
			body: JSON.stringify({ actor: "reviewer" }),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(resolveResponse.status, 200);

	const conflictResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "agent-context-b",
				baseVersion: 1,
				content: "# stale\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(conflictResponse.status, 409);

	const exportResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/export?edit=${editToken}`
	);
	assert.equal(exportResponse.status, 200);
	const bundle = await readJson<WorkspaceExportPayload>(exportResponse);
	const bundleText = JSON.stringify(bundle);
	assert.equal(bundle.format, "mdsync.workspace-export.v1");
	assert.equal(bundle.schemaVersion, 1);
	assert.equal(bundle.workspace.id, created.id);
	assert.equal(bundle.workspace.title, "V2 export fixture");
	assert.equal(bundle.retention.status, "manual");
	assert.equal(bundle.retention.perWorkspaceD1.status, "deferred");
	assert.equal(bundleText.includes(editToken), false);
	assert.equal(bundleText.includes(readToken), false);
	assert.equal(bundleText.includes("read_token_hash"), false);
	assert.equal(bundleText.includes("write_token_hash"), false);

	const exportedFiles = new Map(bundle.files.map((file) => [file.path, file]));
	assert.equal(
		exportedFiles.get(".ha2ha/workspace.json")?.content,
		manifestContent
	);
	assert.equal(
		exportedFiles.get("README.md")?.content,
		"# Export fixture\n\nUpdated for import.\n"
	);
	assert.equal(exportedFiles.get("tasks/RS-007.md")?.content, taskV2);
	assert.equal(
		exportedFiles.get("evidence/RS-007/proof.md")?.content,
		"Evidence captured before export.\n"
	);
	assert.deepEqual(
		bundle.fileVersions
			.filter((fileVersion) => fileVersion.path === "README.md")
			.map((fileVersion) => fileVersion.content),
		["# Export fixture\n", "# Export fixture\n\nUpdated for import.\n"]
	);
	assert.equal(
		bundle.events.filter(
			(event) => event.type === HA2HA_EVENT_TYPES.fileCreated
		).length,
		4
	);
	assert.equal(
		bundle.events.filter(
			(event) => event.type === HA2HA_EVENT_TYPES.fileUpdated
		).length,
		2
	);
	assert.equal(bundle.comments.length, 2);
	assert.equal(
		bundle.comments.some(
			(comment) =>
				comment.body === "README history should survive export." &&
				comment.path === "README.md" &&
				comment.version === 1 &&
				comment.resolvedAt === null
		),
		true
	);
	assert.equal(
		bundle.adminEvents.some(
			(event) =>
				event.type === "file.version_conflict" &&
				event.path === "README.md" &&
				event.payload.latestVersion === 2
		),
		true
	);

	const importResponse = await workspaceRoutes.request(
		"http://api.test/api/workspaces/import",
		{
			body: JSON.stringify(bundle),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(importResponse.status, 201);
	const imported = await readJson<ImportWorkspacePayload>(importResponse);
	assert.notEqual(imported.id, created.id);
	assert.equal(imported.sourceWorkspaceId, created.id);
	assert.equal(imported.importedCounts.files, 4);
	assert.equal(
		imported.importedCounts.fileVersions,
		bundle.fileVersions.length
	);
	assert.equal(imported.importedCounts.events, bundle.events.length);
	assert.equal(imported.importedCounts.comments, bundle.comments.length);
	assert.equal(imported.importedCounts.adminEvents, bundle.adminEvents.length);
	const importedEditToken = new URL(imported.editUrl ?? "").searchParams.get(
		"edit"
	);
	assert.ok(importedEditToken);

	const importedExportResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${imported.id}/export?edit=${importedEditToken}`
	);
	assert.equal(importedExportResponse.status, 200);
	const importedBundle = await readJson<WorkspaceExportPayload>(
		importedExportResponse
	);
	const importedFiles = new Map(
		importedBundle.files.map((file) => [file.path, file])
	);
	assert.deepEqual(
		[...importedFiles.keys()].sort(),
		[...exportedFiles.keys()].sort()
	);
	assert.equal(
		importedFiles.get("evidence/RS-007/proof.md")?.content,
		"Evidence captured before export.\n"
	);
	assert.deepEqual(
		importedBundle.fileVersions
			.filter((fileVersion) => fileVersion.path === "README.md")
			.map((fileVersion) => fileVersion.content),
		["# Export fixture\n", "# Export fixture\n\nUpdated for import.\n"]
	);
	assert.deepEqual(
		importedBundle.comments
			.map((comment) => ({
				body: comment.body,
				path: comment.path,
				version: comment.version,
			}))
			.sort(compareCommentSummary),
		bundle.comments
			.map((comment) => ({
				body: comment.body,
				path: comment.path,
				version: comment.version,
			}))
			.sort(compareCommentSummary)
	);
	assert.deepEqual(
		importedBundle.adminEvents.map((event) => ({
			latestVersion: event.payload.latestVersion,
			path: event.path,
			type: event.type,
		})),
		bundle.adminEvents.map((event) => ({
			latestVersion: event.payload.latestVersion,
			path: event.path,
			type: event.type,
		}))
	);
	const importedActivityResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${imported.id}/activity?edit=${importedEditToken}`
	);
	assert.equal(importedActivityResponse.status, 200);
	const importedActivity = await readJson<ActivityPayload>(
		importedActivityResponse
	);
	assert.equal(
		importedActivity.items.length,
		bundle.events.length + bundle.comments.length + 1
	);
	assert.equal(
		importedActivity.items.filter((item) => item.type === "comment.resolved")
			.length,
		1
	);

	const retentionResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/retention?edit=${editToken}`
	);
	assert.equal(retentionResponse.status, 200);
	const retention = await readJson<RetentionPolicyPayload>(retentionResponse);
	assert.equal(retention.workspaceId, created.id);
	assert.equal(retention.retention.status, "manual");
	assert.equal(retention.retention.coverage.includes("orphaned objects"), true);
	assert.equal(retention.retention.perWorkspaceD1.status, "deferred");

	const orphanedObjectKey = `workspaces/${created.id}/objects/retention-orphan`;
	const outsideObjectKey = "workspaces/outside/objects/not-owned";
	files.put(orphanedObjectKey, "orphan");
	files.put(outsideObjectKey, "outside");
	assert.equal(files.has(orphanedObjectKey), true);
	assert.equal(files.has(outsideObjectKey), true);

	const pruneResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/retention/prune?edit=${editToken}`,
		{
			body: JSON.stringify({
				before: new Date(Date.now() + 60_000).toISOString(),
				include: {
					adminEvents: true,
					events: true,
					fileVersions: true,
					resolvedComments: true,
				},
				orphanedObjectKeys: [orphanedObjectKey, outsideObjectKey],
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(pruneResponse.status, 200);
	const pruned = await readJson<RetentionPrunePayload>(pruneResponse);
	assert.equal(pruned.workspaceId, created.id);
	assert.equal(pruned.pruned.events, 6);
	assert.equal(pruned.pruned.adminEvents, 1);
	assert.equal(pruned.pruned.resolvedComments, 1);
	assert.equal(pruned.pruned.fileVersions, 1);
	assert.equal(pruned.pruned.fileVersionObjects, 1);
	assert.equal(pruned.pruned.orphanedObjects, 1);
	assert.equal(pruned.skipped.orphanedObjects, 1);
	assert.equal(files.has(orphanedObjectKey), false);
	assert.equal(files.has(outsideObjectKey), true);

	const prunedEventsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/events?edit=${editToken}`
	);
	assert.equal(prunedEventsResponse.status, 200);
	assert.equal(
		(await readJson<EventsPayload>(prunedEventsResponse)).events.length,
		0
	);

	const prunedCommentsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments?edit=${editToken}`
	);
	assert.equal(prunedCommentsResponse.status, 200);
	const prunedComments = await readJson<CommentsPayload>(
		prunedCommentsResponse
	);
	assert.deepEqual(
		prunedComments.comments.map((comment) => ({
			body: comment.body,
			resolvedAt: comment.resolvedAt,
		})),
		[
			{
				body: "README history should survive export.",
				resolvedAt: null,
			},
		]
	);
	const prunedActivityResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/activity?edit=${editToken}`
	);
	assert.equal(prunedActivityResponse.status, 200);
	assert.deepEqual(
		(await readJson<ActivityPayload>(prunedActivityResponse)).items.map(
			(item) => item.type
		),
		["comment.created"]
	);

	const prunedHistoryResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files/versions?path=tasks/RS-007.md&edit=${editToken}`
	);
	assert.equal(prunedHistoryResponse.status, 200);
	assert.deepEqual(
		(await readJson<FileVersionsPayload>(prunedHistoryResponse)).versions.map(
			(fileVersion) => fileVersion.version
		),
		[2]
	);
});

test("workspaceRoutes create list and resolve product comments without moving anchors", async (t) => {
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
				files: [{ content: "# Comment target\n", path: "README.md" }],
				readAccess: "token",
				title: "Comment route integration",
				writeAccess: "token",
			}),
			headers: { "Content-Type": "application/json" },
			method: "POST",
		}
	);
	assert.equal(createResponse.status, 201);
	const created = await readJson<CreateWorkspacePayload>(createResponse);
	const editToken = new URL(created.editUrl ?? "").searchParams.get("edit");
	const readToken = new URL(created.workspaceUrl).searchParams.get("k");
	assert.ok(editToken);
	assert.ok(readToken);

	const missingAnchorResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments`,
		{
			body: JSON.stringify({
				actor: "reviewer",
				body: "Missing anchor.",
				path: "README.md",
				selector: { line: 1 },
				version: 99,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(missingAnchorResponse.status, 404);
	assert.equal(
		(await readJson<{ error: string }>(missingAnchorResponse)).error,
		"comment_anchor_not_found"
	);

	const commentResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments`,
		{
			body: JSON.stringify({
				actor: "reviewer",
				body: "Clarify the opening section.",
				path: "README.md",
				selector: { line: 1 },
				version: 1,
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(commentResponse.status, 201);
	const comment = await readJson<CommentPayload>(commentResponse);
	assert.equal(comment.authorId, "reviewer");
	assert.equal(comment.path, "README.md");
	assert.equal(comment.version, 1);
	assert.deepEqual(comment.anchor, { line: 1 });
	assert.equal(comment.resolvedAt, null);

	const updateResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/files`,
		{
			body: JSON.stringify({
				actor: "writer",
				baseVersion: 1,
				content: "# Comment target\n\nUpdated.\n",
				path: "README.md",
			}),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "PUT",
		}
	);
	assert.equal(updateResponse.status, 200);

	const commentsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments?path=README.md&edit=${editToken}`
	);
	assert.equal(commentsResponse.status, 200);
	const comments = await readJson<CommentsPayload>(commentsResponse);
	assert.deepEqual(
		comments.comments.map((item) => ({
			id: item.id,
			path: item.path,
			version: item.version,
		})),
		[{ id: comment.id, path: "README.md", version: 1 }]
	);

	const resolveResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/comments/${comment.id}/resolve`,
		{
			body: JSON.stringify({ actor: "reviewer" }),
			headers: {
				Authorization: `Bearer ${editToken}`,
				"Content-Type": "application/json",
			},
			method: "POST",
		}
	);
	assert.equal(resolveResponse.status, 200);
	const resolved = await readJson<CommentPayload>(resolveResponse);
	assert.equal(resolved.resolvedBy, "reviewer");
	assert.equal(typeof resolved.resolvedAt, "string");
	assert.equal(resolved.version, 1);

	const eventsResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/events?edit=${editToken}`
	);
	assert.equal(eventsResponse.status, 200);
	const events = await readJson<EventsPayload>(eventsResponse);
	assert.deepEqual(
		events.events.map((event) => event.type),
		[HA2HA_EVENT_TYPES.fileCreated, HA2HA_EVENT_TYPES.fileUpdated]
	);

	const unauthorizedActivityResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/activity`
	);
	assert.equal(unauthorizedActivityResponse.status, 401);

	const activityResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/activity?k=${readToken}`
	);
	assert.equal(activityResponse.status, 200);
	const activity = await readJson<ActivityPayload>(activityResponse);
	assert.deepEqual(
		activity.items.map((item) => item.type).sort(),
		[
			HA2HA_EVENT_TYPES.fileCreated,
			HA2HA_EVENT_TYPES.fileUpdated,
			"comment.created",
			"comment.resolved",
		].sort()
	);
	assert.equal(
		activity.items.every(
			(item, index) =>
				index === 0 ||
				(activity.items[index - 1]?.createdAt.localeCompare(item.createdAt) ??
					-1) >= 0
		),
		true
	);
	assert.equal(
		activity.items.find((item) => item.type === "comment.created")?.id,
		`comment:${comment.id}:created`
	);
	assert.equal(
		activity.items.find((item) => item.type === "comment.resolved")?.id,
		`comment:${comment.id}:resolved`
	);
	const serializedActivity = JSON.stringify(activity);
	assert.equal(
		serializedActivity.includes("Clarify the opening section."),
		false
	);
	assert.equal(serializedActivity.includes("selector"), false);
	assert.equal(serializedActivity.includes(editToken), false);

	const overviewResponse = await workspaceRoutes.request(
		`http://api.test/api/workspaces/${created.id}/overview?k=${readToken}`
	);
	assert.equal(overviewResponse.status, 200);
	const overview = workspaceOverviewResponseSchema.parse(
		await overviewResponse.json()
	);
	assert.equal(
		overview.activity.recent.some((item) => item.type === "comment.resolved"),
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

function countNamed(
	counts: Array<{ count: number; name: string }>,
	name: string
) {
	return counts.find((item) => item.name === name)?.count ?? 0;
}

function compareCommentSummary(
	left: { body: string; path: string; version: number },
	right: { body: string; path: string; version: number }
) {
	return (
		left.path.localeCompare(right.path) ||
		left.body.localeCompare(right.body) ||
		left.version - right.version
	);
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

	async raw() {
		const result = await this.execute();
		return result.rows.map((row) =>
			result.columns.map((column) => row[column] ?? null)
		);
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

	has(key: string) {
		return this.objects.has(key);
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
