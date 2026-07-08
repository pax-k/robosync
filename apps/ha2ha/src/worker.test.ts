import assert from "node:assert/strict";
import { test } from "node:test";

import worker from "./worker";

test("HA2HA worker falls back to index.html for missing HTML GET routes", async () => {
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
		new Request("https://ha2ha.example.com/conformance", {
			headers: { Accept: "text/html" },
		}),
		env
	);

	assert.equal(response.status, 200);
	assert.equal(await response.text(), '<div id="root"></div>');
	assert.deepEqual(requestedPaths, ["/conformance", "/index.html"]);
});

test("HA2HA worker preserves non-GET missing asset responses", async () => {
	const env = createAssetEnv(() => new Response("missing", { status: 404 }));

	const response = await worker.fetch(
		new Request("https://ha2ha.example.com/conformance", {
			headers: { Accept: "text/html" },
			method: "POST",
		}),
		env
	);

	assert.equal(response.status, 404);
	assert.equal(await response.text(), "missing");
});

test("HA2HA worker preserves existing asset responses", async () => {
	const env = createAssetEnv(
		() => new Response("asset", { headers: { "Content-Type": "text/plain" } })
	);

	const response = await worker.fetch(
		new Request("https://ha2ha.example.com/index.html", {
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
