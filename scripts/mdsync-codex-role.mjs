#!/usr/bin/env node
import { chmod, readFile, writeFile } from "node:fs/promises";

import {
	createMdsyncClient,
	createMdsyncClientFromUrl,
	validateMdsyncHa2haManifest,
} from "../packages/mdsync-skills/dist/runtime.mjs";

const [role, handoffPath, apiOrigin] = process.argv.slice(2);
if (!(role && handoffPath && apiOrigin)) {
	throw new Error("Role, handoff path, and API origin are required.");
}

const taskId = "DOGFOOD-001";
const actorForRole = `codex-dogfood-${role}`;

if (role === "publisher") {
	await publish();
} else if (role === "viewer") {
	await verifyViewer();
} else if (role === "collaborator-reviewer") {
	await coordinateAndReview();
} else if (role === "conflict") {
	await verifyConflict();
} else {
	throw new Error("Unknown dogfood role.");
}

process.stdout.write(
	`${JSON.stringify({ outcome: "pass", role, summary: `${role} checks passed.` })}\n`
);

async function publish() {
	const setup = createMdsyncClient({ actor: actorForRole, apiOrigin });
	const taskContent = [
		"---",
		`id: ${taskId}`,
		"title: Prove Codex URL handoff",
		"state: ready",
		"owner: null",
		`updated_by: ${actorForRole}`,
		"evidence: []",
		"---",
		"",
		"# Prove Codex URL handoff",
		"",
	].join("\n");
	const created = await setup.createHa2haWorkspace({
		actor: actorForRole,
		files: [{ content: taskContent, path: `tasks/${taskId}.md` }],
		title: "V2-012 Codex dogfood",
	});
	if (!(created.ok && created.data.editUrl)) {
		throw new Error("Publisher could not create capability links.");
	}
	await writeFile(
		handoffPath,
		`${JSON.stringify({
			collaboratorUrl: created.data.editUrl,
			taskId,
			viewerUrl: created.data.workspaceUrl,
			workspaceId: created.data.id,
		})}\n`,
		{ mode: 0o600 }
	);
	await chmod(handoffPath, 0o600);
}

async function verifyViewer() {
	const handoff = await readHandoff();
	const connection = await connect(handoff.viewerUrl);
	if (connection.data.access !== "read") {
		throw new Error("Viewer connection did not remain read-only.");
	}
	await validateConnectionManifest(connection);
	const overview = await connection.data.client.getOverview();
	const guide = await connection.data.client.readFile("HA2HA.md");
	const denied = await connection.data.client.writeFile({
		baseVersion: 1,
		content: "# denied\n",
		path: "STATUS.md",
	});
	if (
		!(overview.ok && guide.ok) ||
		denied.ok ||
		denied.error.code !== "missing_token"
	) {
		throw new Error("Viewer least-privilege checks failed.");
	}
}

async function coordinateAndReview() {
	const handoff = await readHandoff();
	const connection = await connect(handoff.collaboratorUrl);
	await validateConnectionManifest(connection);
	const ha2ha = connection.data.client.createHa2haClient();
	if (!ha2ha.ok) {
		throw new Error("Collaborator could not create an HA2HA client.");
	}
	const claim = await ha2ha.data.claimTask({ taskId });
	const evidence = await ha2ha.data.addEvidence({
		body: "Codex collaborator completed the package-owned handoff workflow.",
		kind: "codex-dogfood",
		result: "pass",
		taskId,
	});
	const currentStatus = await connection.data.client.readFile("STATUS.md");
	if (!(claim.ok && evidence.ok && currentStatus.ok)) {
		throw new Error("Collaborator claim or evidence failed.");
	}
	const status = await connection.data.client.writeFile({
		baseVersion: currentStatus.data.version,
		content: "# Status\n\nCodex collaborator completed the review workflow.\n",
		path: "STATUS.md",
	});
	if (!status.ok) {
		throw new Error("Collaborator status update failed.");
	}
	const comment = await connection.data.client.createComment({
		body: "Dogfood review completed.",
		path: "STATUS.md",
		version: status.data.version,
	});
	if (!comment.ok) {
		throw new Error("Reviewer comment creation failed.");
	}
	const resolved = await connection.data.client.resolveComment({
		commentId: comment.data.id,
	});
	const activity = await connection.data.client.listActivity();
	const events = await connection.data.client.listEvents();
	if (
		!(
			resolved.ok &&
			activity.ok &&
			events.ok &&
			activity.data.items.some((item) => item.type === "comment.created") &&
			activity.data.items.some((item) => item.type === "comment.resolved")
		) ||
		events.data.events.some((event) => event.type.startsWith("comment."))
	) {
		throw new Error("Reviewer activity boundary checks failed.");
	}
}

async function verifyConflict() {
	const handoff = await readHandoff();
	const [first, second] = await Promise.all([
		connect(handoff.collaboratorUrl),
		connect(handoff.collaboratorUrl),
	]);
	const [firstStatus, secondStatus] = await Promise.all([
		first.data.client.readFile("STATUS.md"),
		second.data.client.readFile("STATUS.md"),
	]);
	if (!(firstStatus.ok && secondStatus.ok)) {
		throw new Error("Conflict contexts could not read the baseline.");
	}
	const latestContent = `${firstStatus.data.content}\nConflict writer update.\n`;
	const latest = await first.data.client.writeFile({
		baseVersion: firstStatus.data.version,
		content: latestContent,
		path: "STATUS.md",
	});
	if (!latest.ok) {
		throw new Error("Conflict setup write failed.");
	}
	const stale = await second.data.client.writeFile({
		baseVersion: secondStatus.data.version,
		content: `${secondStatus.data.content}\nStale update.\n`,
		path: "STATUS.md",
	});
	if (
		stale.ok ||
		stale.error.code !== "version_conflict" ||
		stale.error.latest?.content !== latestContent
	) {
		throw new Error("Conflict did not preserve the latest content.");
	}
}

async function connect(url) {
	const connection = await createMdsyncClientFromUrl({
		actor: actorForRole,
		url,
	});
	if (!connection.ok) {
		throw new Error(`URL connection failed: ${connection.error.code}`);
	}
	return connection;
}

async function validateConnectionManifest(connection) {
	const manifest = await connection.data.client.readFile(
		".ha2ha/workspace.json"
	);
	if (!manifest.ok) {
		throw new Error("Manifest read failed.");
	}
	const validated = validateMdsyncHa2haManifest({
		content: manifest.data.content,
		workspaceId: connection.data.workspaceId,
	});
	if (!validated.ok) {
		throw new Error(`Manifest validation failed: ${validated.error.code}`);
	}
}

async function readHandoff() {
	return JSON.parse(await readFile(handoffPath, "utf8"));
}
