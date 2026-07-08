interface AssetFetcher {
	fetch: (request: Request) => Promise<Response>;
}

interface Env {
	ASSETS: AssetFetcher;
}

const HTML_ACCEPT_PATTERN = /\btext\/html\b/u;

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const assetResponse = await env.ASSETS.fetch(request);

		if (
			assetResponse.status !== 404 ||
			request.method !== "GET" ||
			!acceptsHtml(request)
		) {
			return assetResponse;
		}

		const indexUrl = new URL(request.url);
		indexUrl.pathname = "/index.html";
		indexUrl.search = "";

		return env.ASSETS.fetch(new Request(indexUrl, request));
	},
};

function acceptsHtml(request: Request) {
	return HTML_ACCEPT_PATTERN.test(request.headers.get("accept") ?? "");
}
