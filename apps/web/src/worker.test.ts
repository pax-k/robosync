import assert from "node:assert/strict";
import { test } from "node:test";

import worker from "./worker";

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
