import { writeFile } from "node:fs/promises";
import path from "node:path";

const driverSource = ({
	actor,
	expectedResult,
	role,
	taskId,
	updateStatus,
}) => `
import assert from "node:assert/strict";
import { chmod, open, readFile, writeFile } from "node:fs/promises";

const role = ${JSON.stringify(role)};
const actor = ${JSON.stringify(actor)};
const expectedResult = ${JSON.stringify(expectedResult)};
const taskId = ${JSON.stringify(taskId ?? null)};
const updateStatus = ${JSON.stringify(updateStatus ?? false)};
const capability = JSON.parse(await readFile("capability.json", "utf8"));
const capabilityUrl = new URL(capability.viewerUrl ?? capability.collaboratorUrl);
const workspaceId = capabilityUrl.pathname.split("/").filter(Boolean)[1];
assert.ok(workspaceId);
const editToken = capabilityUrl.searchParams.get("edit");
const viewerToken = capabilityUrl.searchParams.get("k");
const token = editToken ?? viewerToken;
assert.ok(token);
const discoveryResponse = await fetch(\`\${capabilityUrl.origin}/.well-known/mdsync.json\`);
assert.equal(discoveryResponse.status, 200);
const discovery = await discoveryResponse.json();
assert.equal(discovery.product, "mdsync");
assert.equal(discovery.discoveryVersion, 1);
assert.equal(discovery.webOrigin, "https://sync.ha2ha.md");
assert.equal(discovery.apiOrigin, "https://sync-api.ha2ha.md");

const api = async (suffix, options = {}) => {
  const viewerQuery = viewerToken ? \`\${suffix.includes("?") ? "&" : "?"}k=\${encodeURIComponent(viewerToken)}\` : "";
  const headers = { accept: "application/json", ...(editToken ? { authorization: \`Bearer \${editToken}\` } : {}), ...(options.body ? { "content-type": "application/json" } : {}) };
  const response = await fetch(\`\${discovery.apiOrigin}/api/workspaces/\${workspaceId}\${suffix}\${viewerQuery}\`, { ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const text = await response.text();
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch { data = text; } }
  return { data, headers: response.headers, status: response.status };
};
const readWorkspaceFile = async (workspacePath) => {
  const response = await api(\`/files?path=\${encodeURIComponent(workspacePath)}\`);
  assert.equal(response.status, 200, \`Read failed for \${workspacePath}: \${response.status}\`);
  return response.data;
};
const writeWorkspaceFile = (workspacePath, content, baseVersion) => api("/files", { method: "PUT", body: { actor, baseVersion, content, contentType: "text/markdown; charset=utf-8", path: workspacePath } });
const replaceField = (content, name, value) => content.replace(new RegExp(\`^\${name}:.*$\`, "mu"), \`\${name}: \${value}\`);
const taskOwner = (content) => /^owner:\\s*(.*)$/mu.exec(content)?.[1]?.trim();
const result = { role, outcome: "pass", result: expectedResult, checks: [] };

if (role === "viewer") {
  assert.ok(viewerToken && !editToken);
  const overview = await api("/overview");
  assert.equal(overview.status, 200);
  const paths = [".ha2ha/workspace.json", "HA2HA.md", "STATUS.md", "tasks/LIVE-001.md", "tasks/LIVE-002.md", "tasks/LIVE-RACE.md"];
  const files = await Promise.all(paths.map(readWorkspaceFile));
  const manifest = JSON.parse(files[0].content);
  assert.equal(manifest.workspaceId, workspaceId);
  assert.equal(manifest.protocol, "ha2ha");
  assert.equal(manifest.protocolVersion, "1.0.0");
  assert.equal(manifest.conflictPolicy, "baseVersion-required");
  for (const task of files.slice(3)) { assert.match(task.content, /^state: ready$/mu); assert.match(task.content, /^owner: null$/mu); }
  const denied = await writeWorkspaceFile("logs/viewer-denied.md", "denied\\n", null);
  assert.ok([401, 403].includes(denied.status));
  const absent = await api("/files?path=logs%2Fviewer-denied.md");
  assert.equal(absent.status, 404);
  result.checks.push("overview-and-foundation-read", "viewer-mutation-denied");
}

if (role === "builder-a" || role === "builder-b") {
  assert.ok(editToken);
  const taskPath = \`tasks/\${taskId}.md\`;
  const initial = await readWorkspaceFile(taskPath);
  let claimed = replaceField(initial.content, "state", "claimed");
  claimed = replaceField(claimed, "owner", actor);
  claimed = replaceField(claimed, "updated_by", actor);
  const claim = await writeWorkspaceFile(taskPath, claimed, initial.version);
  assert.equal(claim.status, 200);
  const evidencePath = \`evidence/\${taskId}/\${role}.md\`;
  const evidence = ["---", \`id: \${role}-\${taskId}\`, "kind: acceptance", \`task: \${taskId}\`, \`actor: \${actor}\`, \`created_at: \${new Date().toISOString()}\`, "result: pass", "target:", \`  workspaceId: \${workspaceId}\`, \`  path: \${taskPath}\`, \`  version: \${claim.data.version}\`, "---", "", "# Live acceptance evidence", "", "The isolated public-skill role completed its assigned task.", ""].join("\\n");
  const evidenceWrite = await writeWorkspaceFile(evidencePath, evidence, null);
  assert.equal(evidenceWrite.status, 200);
  const current = await readWorkspaceFile(taskPath);
  let completed = replaceField(current.content, "state", "done");
  completed = replaceField(completed, "evidence", \`[\${evidencePath}]\`);
  const completion = await writeWorkspaceFile(taskPath, completed, current.version);
  assert.equal(completion.status, 200);
  if (updateStatus) {
    const status = await readWorkspaceFile("STATUS.md");
    const statusWrite = await writeWorkspaceFile("STATUS.md", \`\${status.content.trimEnd()}\\n\\n- Builder B completed LIVE-002 in the live acceptance run.\\n\`, status.version);
    assert.equal(statusWrite.status, 200);
  }
  const adjacentId = taskId === "LIVE-001" ? "LIVE-002" : "LIVE-001";
  const adjacent = await readWorkspaceFile(\`tasks/\${adjacentId}.md\`);
  assert.notEqual(taskOwner(adjacent.content), actor);
  result.checks.push("claim-used-base-version", "evidence-linked", "adjacent-owner-preserved");
}

if (role === "racer-a" || role === "racer-b") {
  assert.ok(editToken);
  const initial = await readWorkspaceFile("tasks/LIVE-RACE.md");
  assert.equal(initial.version, 1);
  let claimed = replaceField(initial.content, "state", "claimed");
  claimed = replaceField(claimed, "owner", actor);
  claimed = replaceField(claimed, "updated_by", actor);
  const ready = await open("race-ready.json", "wx", 0o600);
  await ready.writeFile(JSON.stringify({ actor, baseVersion: initial.version }));
  await ready.close();
  while (true) {
    const go = await readFile("race-go", "utf8").then(() => true).catch(() => false);
    if (go) break;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  const attempt = await writeWorkspaceFile("tasks/LIVE-RACE.md", claimed, initial.version);
  if (attempt.status === 200) {
    const latest = await readWorkspaceFile("tasks/LIVE-RACE.md");
    assert.equal(taskOwner(latest.content), actor);
    result.result = "race-winner";
  } else {
    assert.equal(attempt.status, 409);
    assert.match(JSON.stringify(attempt.data), /version_conflict/u);
    const latest = await readWorkspaceFile("tasks/LIVE-RACE.md");
    assert.equal(latest.version, 2);
    assert.notEqual(taskOwner(latest.content), actor);
    result.result = "race-conflict-preserved";
  }
  result.checks.push("single-saved-base-version-attempt", "winner-or-preserved-conflict");
}

if (role === "reviewer") {
  assert.ok(editToken);
  const status = await readWorkspaceFile("STATUS.md");
  const created = await api("/comments", { method: "POST", body: { actor, body: "Confirm the Builder B live completion line.", path: "STATUS.md", selector: { heading: "Status" }, version: status.version } });
  assert.equal(created.status, 201);
  const resolved = await api(\`/comments/\${created.data.id}/resolve\`, { method: "POST", body: { actor } });
  assert.equal(resolved.status, 200);
  assert.ok(resolved.data.resolvedAt);
  const activity = await api("/activity");
  assert.equal(activity.status, 200);
  assert.match(JSON.stringify(activity.data), /comment[.]created/u);
  assert.match(JSON.stringify(activity.data), /comment[.]resolved/u);
  const events = await api("/events");
  assert.doesNotMatch(JSON.stringify(events.data), /comment[._](?:created|resolved)/u);
  result.checks.push("anchored-comment-created-and-resolved", "product-only-lifecycle");
}

if (role === "protocol-auditor") {
  assert.ok(viewerToken && !editToken);
  const raw = async (suffix) => fetch(\`\${discovery.apiOrigin}/w/\${workspaceId}/raw\${suffix}?k=\${encodeURIComponent(viewerToken)}\`);
  const listing = await raw("");
  assert.equal(listing.status, 200);
  const listingText = await listing.text();
  for (const expected of [".ha2ha/workspace.json", "HA2HA.md", "STATUS.md", "tasks/LIVE-001.md", "tasks/LIVE-002.md", "tasks/LIVE-RACE.md", "evidence/LIVE-001/builder-a.md", "evidence/LIVE-002/builder-b.md"]) assert.ok(listingText.includes(expected));
  const manifestResponse = await raw("/.ha2ha/workspace.json");
  assert.equal(manifestResponse.status, 200);
  assert.ok(manifestResponse.headers.get("content-type")?.includes("application/json"));
  assert.ok(manifestResponse.headers.get("etag"));
  const manifest = await manifestResponse.json();
  assert.equal(manifest.protocol, "ha2ha");
  assert.equal(manifest.protocolVersion, "1.0.0");
  assert.equal(manifest.conflictPolicy, "baseVersion-required");
  const rawEvents = await raw("/events");
  assert.equal(rawEvents.status, 200);
  assert.doesNotMatch(await rawEvents.text(), /comment[._](?:created|resolved)/u);
  for (const task of ["LIVE-001", "LIVE-002", "LIVE-RACE"]) {
    const history = await api(\`/files/versions?path=tasks%2F\${task}.md\`);
    assert.equal(history.status, 200);
    assert.ok(history.data.versions.length >= 2);
  }
  result.checks.push("raw-manifest-paths-and-headers-valid", "portable-events-comment-free", "history-present");
}

await writeFile("role-result.json", JSON.stringify(result), { mode: 0o600 });
await chmod("role-result.json", 0o600);
`;

export const writeRoleDriver = async (directory, configuration) => {
	const target = path.join(directory, "role-once.mjs");
	await writeFile(target, driverSource(configuration), { mode: 0o700 });
	return target;
};
