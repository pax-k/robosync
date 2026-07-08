import assert from "node:assert/strict";
import { test } from "node:test";

import {
	assertValidAccess,
	buildWorkspaceUrls,
	contentSizeBytes,
	extractBearerToken,
	formatRawListing,
	normalizeFilePath,
	randomCapabilityToken,
	tokenHash,
	WorkspaceError,
} from "./domain";

const SHA256_ABC =
	"ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const URL_TOKEN_PATTERN = /^[A-Za-z0-9_-]+$/;

test("normalizeFilePath accepts normalized relative file paths", () => {
	assert.equal(normalizeFilePath("README.md"), "README.md");
	assert.equal(normalizeFilePath("./docs/README.md"), "docs/README.md");
	assert.equal(normalizeFilePath("docs\\guide.md"), "docs/guide.md");
});

test("normalizeFilePath rejects unsafe or non-file paths", () => {
	const invalidPaths = [
		"",
		"/README.md",
		"docs/",
		"docs//README.md",
		"docs/../README.md",
		"docs/./README.md",
		"a".repeat(513),
	] as const;

	for (const invalidPath of invalidPaths) {
		assert.throws(
			() => normalizeFilePath(invalidPath),
			(error: unknown) =>
				error instanceof WorkspaceError &&
				error.status === 400 &&
				error.code === "invalid_path"
		);
	}
});

test("assertValidAccess rejects public writes without public reads", () => {
	assert.doesNotThrow(() => assertValidAccess("public", "public"));
	assert.doesNotThrow(() => assertValidAccess("token", "token"));
	assert.doesNotThrow(() => assertValidAccess("token", "none"));

	assert.throws(
		() => assertValidAccess("token", "public"),
		(error: unknown) =>
			error instanceof WorkspaceError &&
			error.status === 400 &&
			error.code === "invalid_access"
	);
});

test("buildWorkspaceUrls separates API and web origins with capability queries", () => {
	const urls = buildWorkspaceUrls({
		editToken: "edit-token",
		id: "workspace-1",
		origin: "https://server.example.com/",
		readAccess: "token",
		readToken: "read-token",
		webOrigin: "https://web.example.com/",
		writeAccess: "token",
	});

	assert.deepEqual(urls, {
		editUrl: "https://web.example.com/w/workspace-1?edit=edit-token",
		rawUrl: "https://server.example.com/w/workspace-1/raw?k=read-token",
		workspaceUrl: "https://web.example.com/w/workspace-1?k=read-token",
	});
});

test("buildWorkspaceUrls omits edit URL for read-only workspaces", () => {
	const urls = buildWorkspaceUrls({
		editToken: null,
		id: "workspace-1",
		origin: "https://server.example.com",
		readAccess: "public",
		readToken: null,
		writeAccess: "none",
	});

	assert.equal(urls.editUrl, undefined);
	assert.equal(urls.rawUrl, "https://server.example.com/w/workspace-1/raw");
	assert.equal(urls.workspaceUrl, "https://server.example.com/w/workspace-1");
});

test("formatRawListing emits HA2HA listing metadata and trailing newline", () => {
	const listing = formatRawListing({
		files: ["README.md", "tasks/RS-001.md"],
		id: "workspace-1",
		title: "Demo",
		updatedAt: "2026-07-08T00:00:00.000Z",
	});

	assert.equal(
		listing,
		[
			"# ha2ha workspace: workspace-1",
			"title: Demo",
			"updated_at: 2026-07-08T00:00:00.000Z",
			"",
			"README.md",
			"tasks/RS-001.md",
			"",
		].join("\n")
	);
});

test("token and content helpers preserve expected boundary behavior", async () => {
	assert.equal(extractBearerToken("Bearer token-1"), "token-1");
	assert.equal(extractBearerToken("bearer token-2"), "token-2");
	assert.equal(extractBearerToken("Token token-3"), null);
	assert.equal(extractBearerToken(null), null);
	assert.equal(contentSizeBytes("é"), 2);
	assert.equal(await tokenHash("abc"), SHA256_ABC);
	assert.match(randomCapabilityToken(), URL_TOKEN_PATTERN);
});
