#!/usr/bin/env node
import {
	baseUrl,
	buildRawFileUrl,
	buildRawListingUrl,
	buildWorkspaceUrl,
	contentTypeForPath,
	die,
	parseArgs,
	readTextFile,
} from "./lib/mdsync.mjs";

const USAGE = `Usage:
  node scripts/update-file.mjs <workspace-id> <path> <file> --token <write-token> --base-version <version>`;

const { options, positional } = parseArgs(process.argv.slice(2), USAGE);
const [workspaceId, workspaceFilePath, file] = positional;
const token = options.token ?? process.env.MDSYNC_WRITE_TOKEN;
const baseVersion = Number(options["base-version"]);

if (!(workspaceId && workspaceFilePath && file && positional.length === 3)) {
	console.error(USAGE);
	process.exit(1);
}
if (!token) {
	die("--token or MDSYNC_WRITE_TOKEN is required.");
}
if (!(Number.isInteger(baseVersion) && baseVersion > 0)) {
	die("--base-version must be a positive integer.");
}

const content = await readTextFile(file);
const url = `${baseUrl()}/api/workspaces/${encodeURIComponent(workspaceId)}/files`;
const response = await fetch(url, {
	body: JSON.stringify({
		baseVersion,
		content,
		contentType: contentTypeForPath(workspaceFilePath),
		path: workspaceFilePath,
	}),
	headers: {
		Authorization: `Bearer ${token}`,
		"Content-Type": "application/json",
	},
	method: "PUT",
});
const payload = await response.json();

if (response.status === 409) {
	console.error(
		"Update conflict: latest content must be merged before retrying."
	);
	if (payload.latest) {
		console.error(`Latest version: ${payload.latest.version}`);
	}
	process.exit(1);
}
if (!response.ok) {
	die(
		`PUT ${url} failed with ${response.status}: ${payload.message ?? payload.error ?? response.statusText}`
	);
}

console.log(`Updated: ${payload.path}`);
console.log(`Version: ${payload.version}`);
console.log(`Workspace ID: ${payload.workspaceId}`);
console.log(
	`Agent raw listing: ${buildRawListingUrl(payload.workspaceId, token)}`
);
console.log(
	`Agent raw file: ${buildRawFileUrl(payload.workspaceId, payload.path, token)}`
);
console.log(`Edit link: ${buildWorkspaceUrl(payload.workspaceId, token)}`);
