import assert from "node:assert/strict";
import { test } from "node:test";

import worker from "./worker";

test("web worker serves configured MDSync discovery without capability data", async () => {
	const env = {
		API_ORIGIN: "https://api.example.com/",
		...createAssetEnv(() => new Response("unused")),
	};
	const response = await worker.fetch(
		new Request("https://app.example.com/.well-known/mdsync.json?edit=secret"),
		env
	);

	assert.equal(response.status, 200);
	assert.deepEqual(await response.json(), {
		apiOrigin: "https://api.example.com",
		discoveryVersion: 1,
		product: "mdsync",
		webOrigin: "https://app.example.com",
	});
});

test("web worker fails closed for unconfigured custom-domain discovery", async () => {
	const response = await worker.fetch(
		new Request("https://custom.example.com/.well-known/mdsync.json"),
		createAssetEnv(() => new Response("unused"))
	);

	assert.equal(response.status, 503);
	assert.deepEqual(await response.json(), {
		error: "discovery_unconfigured",
		message: "MDSync API discovery is not configured for this domain.",
	});
});

test("web worker fails closed for a malformed configured API origin", async () => {
	const response = await worker.fetch(
		new Request("https://custom.example.com/.well-known/mdsync.json"),
		{
			API_ORIGIN: "not an origin",
			...createAssetEnv(() => new Response("unused")),
		}
	);

	assert.equal(response.status, 503);
	assert.equal(
		((await response.json()) as { error?: string }).error,
		"discovery_unconfigured"
	);
});

test("web worker derives local and Workers API discovery origins", async () => {
	const env = createAssetEnv(() => new Response("unused"));
	const cases = [
		["http://localhost:5173", "http://localhost:3000"],
		[
			"https://mdsync-web-pax.example.workers.dev",
			"https://mdsync-server-pax.example.workers.dev",
		],
	] as const;
	const responses = await Promise.all(
		cases.map(([source]) =>
			worker.fetch(new Request(`${source}/.well-known/mdsync.json`), env)
		)
	);
	const results = await Promise.all(
		responses.map(async (response) => ({
			payload: (await response.json()) as { apiOrigin?: string },
			status: response.status,
		}))
	);
	for (const [index, result] of results.entries()) {
		const apiOrigin = cases[index]?.[1];
		assert.equal(result.status, 200);
		assert.equal(result.payload.apiOrigin, apiOrigin);
	}
});

test("web worker falls back to index.html for missing HTML GET routes", async () => {
	const requestedPaths: string[] = [];
	const env = createAssetEnv((request) => {
		const url = new URL(request.url);
		requestedPaths.push(url.pathname);
		if (url.pathname === "/index.html") {
			return new Response('<div id="root"></div>', {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}
		return new Response("missing", { status: 404 });
	});

	const response = await worker.fetch(
		new Request("https://web.example.com/w/workspace-1?edit=secret", {
			headers: { Accept: "text/html" },
		}),
		env
	);

	assert.equal(response.status, 200);
	assert.equal(await response.text(), '<div id="root"></div>');
	assert.deepEqual(requestedPaths, ["/w/workspace-1", "/index.html"]);
});

test("web worker supports direct public documentation routes", async () => {
	const requestedPaths: string[] = [];
	const env = createAssetEnv((request) => {
		const { pathname } = new URL(request.url);
		requestedPaths.push(pathname);
		if (pathname === "/index.html") {
			return new Response('<div id="root"></div>', {
				headers: { "Content-Type": "text/html; charset=utf-8" },
			});
		}
		return new Response("missing", { status: 404 });
	});

	const response = await worker.fetch(
		new Request("https://web.example.com/docs/security", {
			headers: { Accept: "text/html" },
		}),
		env
	);

	assert.equal(response.status, 200);
	assert.deepEqual(requestedPaths, ["/docs/security", "/index.html"]);
});

test("web worker preserves non-HTML missing asset responses", async () => {
	const env = createAssetEnv(() => new Response("missing", { status: 404 }));

	const response = await worker.fetch(
		new Request("https://web.example.com/assets/app.js", {
			headers: { Accept: "application/javascript" },
		}),
		env
	);

	assert.equal(response.status, 404);
	assert.equal(await response.text(), "missing");
});

test("web worker preserves existing asset responses", async () => {
	const env = createAssetEnv(
		() => new Response("asset", { headers: { "Content-Type": "text/plain" } })
	);

	const response = await worker.fetch(
		new Request("https://web.example.com/index.html", {
			headers: { Accept: "text/html" },
		}),
		env
	);

	assert.equal(response.status, 200);
	assert.equal(await response.text(), "asset");
});

function createAssetEnv(fetchAsset: (request: Request) => Response) {
	return {
		ASSETS: {
			fetch: (request: Request) => Promise.resolve(fetchAsset(request)),
		},
	};
}
