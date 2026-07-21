import assert from "node:assert/strict";

export const API_ORIGIN = "https://sync-api.ha2ha.md";
export const WEB_ORIGIN = "https://sync.ha2ha.md";
export const RELEASE_COMMIT = "140541f200723f3ef5e1a3c0273f67f39b533b3e";
export const RELEASE_TAG = "v0.1.5";
const WORKSPACE_URL_PATTERN = /^\/w\/([^/]+)$/u;

export const parseCapabilityUrl = (value, expectedName) => {
	const url = new URL(value);
	const match = WORKSPACE_URL_PATTERN.exec(url.pathname);
	assert.ok(match, `Expected a workspace URL, received ${url.pathname}`);
	const token = url.searchParams.get(expectedName);
	assert.ok(token, `Expected ${expectedName} capability.`);
	return { token, url, workspaceId: match[1] };
};

export const requestJson = async ({
	body,
	method = "GET",
	readToken,
	token,
	url,
}) => {
	const headers = { accept: "application/json" };
	if (body !== undefined) {
		headers["content-type"] = "application/json";
	}
	if (token) {
		headers.authorization = `Bearer ${token}`;
	}
	const requestUrl = new URL(url);
	if (readToken) {
		requestUrl.searchParams.set("k", readToken);
	}
	const response = await fetch(requestUrl, {
		body: body === undefined ? undefined : JSON.stringify(body),
		headers,
		method,
	});
	const text = await response.text();
	let data = null;
	if (text.length > 0) {
		try {
			data = JSON.parse(text);
		} catch {
			data = text;
		}
	}
	return {
		data,
		headers: response.headers,
		ok: response.ok,
		status: response.status,
	};
};

export const workspaceRequest = async ({
	body,
	method,
	path,
	readToken,
	token,
	workspaceId,
}) =>
	requestJson({
		body,
		method,
		readToken,
		token,
		url: `${API_ORIGIN}/api/workspaces/${workspaceId}${path}`,
	});

export const readFile = async ({ path, token, workspaceId }) => {
	const response = await workspaceRequest({
		path: `/files?path=${encodeURIComponent(path)}`,
		readToken: token,
		workspaceId,
	});
	assert.equal(
		response.status,
		200,
		`Could not read ${path}: ${response.status}`
	);
	return response.data;
};

export const readAllWorkspaceText = async ({ token, workspaceId }) => {
	const tree = await workspaceRequest({
		path: "/tree",
		readToken: token,
		workspaceId,
	});
	assert.equal(tree.status, 200, "Workspace tree must be readable.");
	return Promise.all(
		tree.data.files.map(async (entry) => {
			const file = await readFile({ path: entry.path, token, workspaceId });
			return { ...entry, content: file.content };
		})
	);
};

export const parseTask = (content) => {
	const field = (name) => {
		const prefix = `${name}:`;
		const line = content
			.split("\n")
			.find((candidate) => candidate.startsWith(prefix));
		return line ? line.slice(prefix.length).trim() : null;
	};
	const evidenceValue = field("evidence") ?? "[]";
	const evidence = evidenceValue
		.replace(/^\[|\]$/gu, "")
		.split(",")
		.map((item) => item.trim().replace(/^['"]|['"]$/gu, ""))
		.filter(Boolean);
	return {
		evidence,
		id: field("id"),
		owner: field("owner") === "null" ? null : field("owner"),
		state: field("state"),
		updatedBy: field("updated_by"),
	};
};

export const findCapabilityLeaks = (values, secrets) => {
	const leaks = [];
	const capabilityPattern =
		/(?:[?&](?:edit|k)=|authorization:\s*bearer\s+)[A-Za-z0-9_-]{16,}/giu;
	for (const { label, text } of values) {
		for (const secret of secrets) {
			if (secret && text.includes(secret)) {
				leaks.push(`${label}:exact-secret`);
			}
		}
		if (capabilityPattern.test(text)) {
			leaks.push(`${label}:capability-pattern`);
		}
		capabilityPattern.lastIndex = 0;
	}
	return leaks;
};

export const verifyDiscovery = async () => {
	const [web, api] = await Promise.all([
		requestJson({ url: `${WEB_ORIGIN}/.well-known/mdsync.json` }),
		requestJson({ url: `${API_ORIGIN}/.well-known/mdsync.json` }),
	]);
	assert.equal(web.status, 200);
	assert.equal(api.status, 200);
	assert.deepEqual(web.data, api.data);
	assert.equal(web.data.apiOrigin, API_ORIGIN);
	assert.equal(web.data.webOrigin, WEB_ORIGIN);
	return web.data;
};
