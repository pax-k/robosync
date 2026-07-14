#!/usr/bin/env node
import {
	createMdsyncClient,
	createMdsyncClientFromUrl,
	validateMdsyncHa2haManifest,
} from "../packages/mdsync-client/dist/index.mjs";

const apiOrigin = process.env.MDSYNC_BASE_URL?.trim();
if (!apiOrigin) {
	throw new Error("MDSYNC_BASE_URL is required for the URL handoff smoke.");
}

const publisherActor = "url-smoke-agent-a";
const collaboratorActor = "url-smoke-agent-b";
const taskId = `URL-${Date.now()}`;
const taskContent = [
	"---",
	`id: ${taskId}`,
	"title: Prove URL-only HA2HA handoff",
	"state: ready",
	"owner: null",
	`updated_by: ${publisherActor}`,
	"evidence: []",
	"---",
	"",
	"# Prove URL-only HA2HA handoff",
	"",
].join("\n");

const publisher = createMdsyncClient({
	actor: publisherActor,
	apiOrigin,
});
const created = await publisher.createHa2haWorkspace({
	actor: publisherActor,
	files: [{ content: taskContent, path: `tasks/${taskId}.md` }],
	title: "V2-012 URL handoff smoke",
});
if (!created.ok) {
	throw new Error(`HA2HA workspace publishing failed: ${created.error.code}`);
}
if (!(created.data.workspaceUrl && created.data.editUrl)) {
	throw new Error("HA2HA publishing did not return both capability links.");
}

const viewer = await createMdsyncClientFromUrl({
	actor: "url-smoke-viewer",
	url: created.data.workspaceUrl,
});
if (!viewer.ok) {
	throw new Error(
		`Viewer URL bootstrap failed: ${viewer.error.code} (${viewer.error.status ?? "no-status"}).`
	);
}
if (viewer.data.access !== "read") {
	throw new Error(
		`Viewer URL resolved unexpected access: ${viewer.data.access}.`
	);
}
const manifest = await viewer.data.client.readFile(".ha2ha/workspace.json");
if (!manifest.ok) {
	throw new Error(`Manifest read failed: ${manifest.error.code}`);
}
const validatedManifest = validateMdsyncHa2haManifest({
	content: manifest.data.content,
	workspaceId: viewer.data.workspaceId,
});
if (!validatedManifest.ok) {
	throw new Error(
		`Manifest validation failed: ${validatedManifest.error.code}`
	);
}
const viewerMutation = await viewer.data.client.writeFile({
	baseVersion: 1,
	content: "# This write must fail.\n",
	path: "STATUS.md",
});
if (viewerMutation.ok || viewerMutation.error.code !== "missing_token") {
	throw new Error("Viewer URL did not fail closed on mutation.");
}

const collaborator = await createMdsyncClientFromUrl({
	actor: collaboratorActor,
	url: created.data.editUrl,
});
if (!collaborator.ok) {
	throw new Error(
		`Collaborator URL bootstrap failed: ${collaborator.error.code} (${collaborator.error.status ?? "no-status"}).`
	);
}
if (collaborator.data.access !== "edit") {
	throw new Error(
		`Collaborator URL resolved unexpected access: ${collaborator.data.access}.`
	);
}
const ha2ha = collaborator.data.client.createHa2haClient();
if (!ha2ha.ok) {
	throw new Error(`HA2HA client creation failed: ${ha2ha.error.code}`);
}
const claim = await ha2ha.data.claimTask({ taskId });
if (!claim.ok) {
	throw new Error(`Task claim failed: ${claim.error.code}`);
}
const evidence = await ha2ha.data.addEvidence({
	body: "URL-only collaborator bootstrap, task claim, and evidence write passed.",
	kind: "url-handoff-smoke",
	result: "pass",
	taskId,
});
if (!evidence.ok) {
	throw new Error(`Evidence write failed: ${evidence.error.code}`);
}
const evidenceFile = await collaborator.data.client.readFile(
	evidence.data.evidence.path
);
if (!evidenceFile.ok) {
	throw new Error(`Evidence read failed: ${evidenceFile.error.code}`);
}
if (
	evidenceFile.data.content.includes(created.data.workspaceUrl) ||
	evidenceFile.data.content.includes(created.data.editUrl)
) {
	throw new Error("A capability URL leaked into generated evidence.");
}
const statusWrite = await collaborator.data.client.writeFile({
	baseVersion: 1,
	content: "# Status\n\nAgent B completed the URL handoff smoke.\n",
	path: "STATUS.md",
});
if (!statusWrite.ok) {
	throw new Error(`Status write failed: ${statusWrite.error.code}`);
}
const comment = await collaborator.data.client.createComment({
	body: "Reviewer confirms the URL handoff evidence.",
	path: "STATUS.md",
	version: statusWrite.data.version,
});
if (!comment.ok) {
	throw new Error(`Comment creation failed: ${comment.error.code}`);
}
const resolvedComment = await collaborator.data.client.resolveComment({
	commentId: comment.data.id,
});
if (!resolvedComment.ok) {
	throw new Error(`Comment resolution failed: ${resolvedComment.error.code}`);
}
const activity = await collaborator.data.client.listActivity();
if (
	!(
		activity.ok &&
		activity.data.items.some((item) => item.type === "comment.created") &&
		activity.data.items.some((item) => item.type === "comment.resolved")
	)
) {
	throw new Error("Product activity omitted the comment lifecycle.");
}
const protocolEvents = await collaborator.data.client.listEvents();
if (
	!protocolEvents.ok ||
	protocolEvents.data.events.some((event) => event.type.startsWith("comment."))
) {
	throw new Error("Portable events included MDSync comment activity.");
}
const editToken = new URL(created.data.editUrl).searchParams.get("edit");
if (!editToken) {
	throw new Error("Collaborator URL did not contain an edit capability.");
}
const rawEventsResponse = await fetch(
	`${collaborator.data.apiOrigin}/w/${created.data.id}/raw/events?edit=${encodeURIComponent(editToken)}`
);
if (!rawEventsResponse.ok) {
	throw new Error(
		`Raw events request failed with ${rawEventsResponse.status}.`
	);
}
const rawEvents = await rawEventsResponse.json();
if (
	!Array.isArray(rawEvents.events) ||
	rawEvents.events.some(
		(event) =>
			typeof event === "object" &&
			event !== null &&
			"type" in event &&
			String(event.type).startsWith("comment.")
	)
) {
	throw new Error("Raw HA2HA events included MDSync comment activity.");
}

const observer = await createMdsyncClientFromUrl({
	actor: publisherActor,
	url: created.data.editUrl,
});
if (!observer.ok) {
	throw new Error("Publisher could not rejoin from the collaborator URL.");
}
const observedTask = await observer.data.client.readFile(`tasks/${taskId}.md`);
if (
	!(
		observedTask.ok &&
		observedTask.data.content.includes(`owner: ${collaboratorActor}`)
	)
) {
	throw new Error("Publisher did not observe the collaborator task claim.");
}
const staleWrite = await observer.data.client.writeFile({
	baseVersion: 1,
	content: "# Stale publisher write\n",
	path: "STATUS.md",
});
if (
	staleWrite.ok ||
	staleWrite.error.code !== "version_conflict" ||
	!staleWrite.error.latest?.content.includes("Agent B completed")
) {
	throw new Error("Stale write did not preserve the collaborator version.");
}

const listing = await collaborator.data.client.listFiles();
if (!listing.ok) {
	throw new Error(`Workspace listing failed: ${listing.error.code}`);
}
const workspaceFiles = await Promise.all(
	listing.data.files.map(async (file) => ({
		content: await collaborator.data.client.readFile(file.path),
		path: file.path,
	}))
);
for (const { content, path: filePath } of workspaceFiles) {
	if (
		content.ok &&
		(content.data.content.includes(created.data.workspaceUrl) ||
			content.data.content.includes(created.data.editUrl))
	) {
		throw new Error(`A capability URL leaked into ${filePath}.`);
	}
}

process.stdout.write(
	`${JSON.stringify(
		{
			access: { collaborator: "edit", viewer: "read" },
			capabilityLeak: false,
			comments: "created-and-resolved",
			conflict: "version_conflict",
			eventBoundary: "protocol-only",
			ok: true,
			protocolVersion: "1.0.0",
			workspaceId: created.data.id,
		},
		null,
		2
	)}\n`
);
